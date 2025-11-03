#!/usr/bin/env tsx

import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantTools, buildAssistantPrompt } from '@/lib/vapi'

/**
 * Sync all assistants with latest prompts and tools
 */

async function syncAssistant(agent: any) {
  console.log(`\n🔧 Syncing assistant: ${agent.name} (${agent.vapiAssistantId})...`)

  try {
    const project = await prisma.project.findUnique({ where: { id: agent.projectId } })
    if (!project) {
      console.error(`   ❌ Project not found: ${agent.projectId}`)
      return false
    }

    const vapi = createVapiClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
    const tools = buildAssistantTools(appUrl, agent.projectId)
    const system = buildAssistantPrompt(project.name, project.trade)

    console.log(`   Tools configured: ${tools.length}`)
    console.log(`   System prompt length: ${system.length} chars`)

    const current = await vapi.getAssistant(agent.vapiAssistantId)
    const existingModel = (current as any).model || {}
    const provider = existingModel.provider || 'openai'
    const modelName = existingModel.model || 'gpt-4o-mini'

    await vapi.updateAssistant(agent.vapiAssistantId, {
      model: {
        provider,
        model: modelName,
        temperature: existingModel.temperature ?? 0.7,
        messages: [{ role: 'system', content: system } as any],
        tools,
      },
    } as any)

    await prisma.eventLog.create({
      data: { projectId: agent.projectId, type: 'agent.synced', payload: { agentId: agent.id } },
    })

    console.log(`   ✅ Assistant synced successfully!`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 Syncing All Assistants with Latest Prompts and Tools\n')
  console.log('='.repeat(60))

  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'desc' },
  })

  console.log(`Found ${agents.length} assistants to sync\n`)

  let successCount = 0
  for (const agent of agents) {
    const success = await syncAssistant(agent)
    if (success) successCount++
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Sync complete: ${successCount}/${agents.length} assistants updated`)
  console.log('='.repeat(60) + '\n')
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e.message, e.stack)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

