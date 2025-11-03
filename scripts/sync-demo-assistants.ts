#!/usr/bin/env tsx

import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantTools, buildAssistantPrompt } from '@/lib/vapi'
import 'dotenv/config'

/**
 * Sync ONLY the 3 demo assistants to ensure they always match the latest prompts and tools
 */

const DEMO_ASSISTANT_IDS = [
  '66ac9a80-cee3-4084-95fa-c51ede8ccf5c', // Demo Plumbing
  'ee143a79-7d18-451f-ae8e-c1e78c83fa0f', // Demo HVAC
  'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5', // Demo Electrical
]

async function syncDemoAssistant(vapiAssistantId: string) {
  console.log(`\n🔧 Syncing demo assistant: ${vapiAssistantId}...`)

  try {
    // Find agent by vapiAssistantId
    const agent = await prisma.agent.findFirst({
      where: { vapiAssistantId, deletedAt: null },
      include: { project: true },
    })

    if (!agent) {
      console.error(`   ❌ Agent not found in database for vapiAssistantId: ${vapiAssistantId}`)
      return false
    }

    const vapi = createVapiClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
    const tools = buildAssistantTools(appUrl, agent.projectId)
    const system = buildAssistantPrompt(agent.project.name, agent.project.trade)

    console.log(`   📝 Tools: ${tools.length}`)
    console.log(`   📝 System prompt: ${system.length} chars`)

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
      data: { projectId: agent.projectId, type: 'agent.synced', payload: { agentId: agent.id, demo: true } },
    })

    console.log(`   ✅ Synced successfully`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 Syncing Demo Assistants with Latest Prompts and Tools\n')
  console.log('='.repeat(70))

  let successCount = 0
  for (const vapiAssistantId of DEMO_ASSISTANT_IDS) {
    const success = await syncDemoAssistant(vapiAssistantId)
    if (success) successCount++
  }

  console.log('\n' + '='.repeat(70))
  console.log(`✅ Sync complete: ${successCount}/${DEMO_ASSISTANT_IDS.length} demo assistants updated`)
  console.log('='.repeat(70) + '\n')
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e.message, e.stack)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

