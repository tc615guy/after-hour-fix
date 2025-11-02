#!/usr/bin/env tsx

import 'dotenv/config'
import { prisma } from '../src/lib/db'
import { createVapiClient, buildAssistantPrompt, buildAssistantTools } from '../src/lib/vapi'

/**
 * CRITICAL FIX: Update all demo assistants with correct system prompts and tools
 */

const DEMO_PROJECTS = {
  'Demo Plumbing': { projectId: 'demo-plumbing', trade: 'plumbing' },
  'Demo HVAC': { projectId: 'demo-hvac', trade: 'hvac' },
  'Demo Electrical': { projectId: 'demo-electrical', trade: 'electrical' },
}

async function fixDemoAssistant(name: string, projectId: string, trade: string) {
  console.log(`\n🔧 Fixing ${name}...`)

  try {
    // Get the agent from database
    const agent = await prisma.agent.findFirst({ 
      where: { projectId }, 
      orderBy: { createdAt: 'desc' },
      include: { project: true }
    })

    if (!agent) {
      console.error(`   ❌ No agent found for ${name}`)
      return false
    }

    console.log(`   Agent ID: ${agent.id}`)
    console.log(`   Vapi Assistant ID: ${agent.vapiAssistantId}`)

    // Build correct prompt and tools
    const project = agent.project
    const systemPrompt = buildAssistantPrompt(project.name, project.trade)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
    const tools = buildAssistantTools(appUrl, projectId)

    console.log(`   System prompt length: ${systemPrompt.length} chars`)
    console.log(`   Tools configured: ${tools.length}`)

    // Update assistant in Vapi
    const vapi = createVapiClient()
    const updated = await vapi.updateAssistant(agent.vapiAssistantId, {
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [{ role: 'system', content: systemPrompt }],
        tools,
      },
      voice: {
        provider: 'cartesia',
        voiceId: 'ec1e269e-9ca0-402f-8a18-58e0e022355a', // Ariana
        model: 'sonic-3',
        language: 'en',
      },
      firstMessage: "Thanks for calling! I can help you right away. What's going on?",
      recordingEnabled: true,
    })

    console.log(`   ✅ Updated successfully`)
    console.log(`   Voice: ${updated.voice?.provider} - ${updated.voice?.voiceId}`)
    console.log(`   Model: ${updated.model?.provider} - ${updated.model?.model}`)

    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    if (error.stack) console.error(`   Stack: ${error.stack}`)
    return false
  }
}

async function main() {
  console.log('🚨 FIXING ALL DEMO ASSISTANTS WITH CORRECT SYSTEM PROMPTS\n')

  let successCount = 0

  for (const [name, config] of Object.entries(DEMO_PROJECTS)) {
    const success = await fixDemoAssistant(name, config.projectId, config.trade)
    if (success) successCount++
  }

  console.log('\n' + '='.repeat(60))

  if (successCount === Object.keys(DEMO_PROJECTS).length) {
    console.log(`✅ SUCCESS: All ${successCount} demo assistants updated!`)
  } else {
    console.log(`⚠️  WARNING: Only ${successCount} of ${Object.keys(DEMO_PROJECTS).length} assistants updated.`)
  }

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

