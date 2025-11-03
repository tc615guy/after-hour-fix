#!/usr/bin/env tsx

import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantPrompt, buildAssistantTools } from '@/lib/vapi'
import 'dotenv/config'

/**
 * Upgrade all assistants to premium stack:
 * - GPT-4o (best reasoning and function calling)
 * - ElevenLabs voice (most natural, human-like)
 * - Deepgram Nova 2 transcriber (best accuracy)
 */

async function upgradeAssistant(agent: any) {
  console.log(`\n🚀 Upgrading assistant: ${agent.name} (${agent.vapiAssistantId})...`)

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

    console.log(`   📝 Tools configured: ${tools.length}`)
    console.log(`   📝 System prompt: ${system.length} chars`)

    await vapi.updateAssistant(agent.vapiAssistantId, {
      model: {
        provider: 'openai',
        model: 'gpt-4o', // Premium model for best function calling and reasoning
        temperature: 0.7,
        messages: [{ role: 'system', content: system } as any],
        tools,
      },
      voice: {
        provider: '11labs',
        voiceId: 'burt', // Professional, warm male voice from ElevenLabs
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2', // Best accuracy transcription
        language: 'en',
      },
    } as any)

    await prisma.eventLog.create({
      data: { 
        projectId: agent.projectId, 
        type: 'agent.upgraded',
        payload: { 
          agentId: agent.id,
          stack: 'gpt-4o, elevenlabs-burt, deepgram-nova-2'
        }
      },
    })

    console.log(`   ✅ Assistant upgraded to premium stack!`)
    console.log(`      - Model: GPT-4o`)
    console.log(`      - Voice: ElevenLabs Burt`)
    console.log(`      - Transcriber: Deepgram Nova 2`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 Upgrading All Assistants to Premium Stack\n')
  console.log('='.repeat(80))
  console.log('Stack Details:')
  console.log('  • Model: GPT-4o (OpenAI)')
  console.log('  • Voice: ElevenLabs Burt')
  console.log('  • Transcriber: Deepgram Nova 2')
  console.log('='.repeat(80))

  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'desc' },
  })

  console.log(`\nFound ${agents.length} assistants to upgrade\n`)

  let successCount = 0
  for (const agent of agents) {
    const success = await upgradeAssistant(agent)
    if (success) successCount++
  }

  console.log('\n' + '='.repeat(80))
  console.log(`✅ Upgrade complete: ${successCount}/${agents.length} assistants upgraded`)
  console.log('='.repeat(80) + '\n')
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e.message, e.stack)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

