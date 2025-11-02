#!/usr/bin/env tsx

import 'dotenv/config'
import { prisma } from '../src/lib/db'
import { createVapiClient, buildAssistantPrompt, buildAssistantTools } from '../src/lib/vapi'

async function main() {
  const projectId = 'cmhi1nvid0001la04rg1x77ob'
  
  console.log('🔧 Fixing Big Daddy Plumbing project...')

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    console.error('❌ Project not found')
    process.exit(1)
  }

  console.log(`   Project: ${project.name} (${project.trade})`)

  // Check if agent already exists
  const existingAgent = await prisma.agent.findFirst({ where: { projectId } })
  if (existingAgent) {
    console.log(`   ✅ Agent already exists: ${existingAgent.id}`)
    process.exit(0)
  }

  // Create assistant in Vapi
  console.log('   Creating Vapi assistant...')
  const vapiClient = createVapiClient()
  const systemPrompt = buildAssistantPrompt(project.name, project.trade)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
  const tools = buildAssistantTools(appUrl, projectId)

  // Map trade to demo assistant ID
  const DEMO_ASSISTANTS: Record<string, string> = {
    'Electrical': 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5',
    'HVAC': 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f',
    'Plumbing': '66ac9a80-cee3-4084-95fa-c51ede8ccf5c', // Fixed to use correct ID
  }

  const trade = project.trade || 'Plumbing'
  const demoAssistantId = DEMO_ASSISTANTS[trade] || DEMO_ASSISTANTS['Plumbing']

  console.log(`   Using demo assistant: ${demoAssistantId} for trade: ${trade}`)

  try {
    // Fetch demo assistant
    const demoAssistant = await vapiClient.getAssistant(demoAssistantId)

    // Create new assistant
    const vapiAssistant = await vapiClient.createAssistant({
      name: `${project.name} AI Assistant`,
      firstMessage: demoAssistant.firstMessage || "Hey there, thanks for calling! I can help you right away. What's going on?",
      voice: demoAssistant.voice,
      model: {
        ...demoAssistant.model,
        messages: [{ role: 'system', content: systemPrompt }],
        tools,
      },
      recordingEnabled: demoAssistant.recordingEnabled ?? true,
    })

    console.log(`   ✅ Vapi assistant created: ${vapiAssistant.id}`)

    // Create agent record
    const agent = await prisma.agent.create({
      data: {
        projectId,
        vapiAssistantId: vapiAssistant.id,
        name: `${project.name} AI Assistant`,
        voice: demoAssistant.voice?.voiceId || 'ariana',
        basePrompt: systemPrompt,
      },
    })

    console.log(`   ✅ Agent created: ${agent.id}`)

    await prisma.eventLog.create({
      data: {
        projectId,
        type: 'agent.created',
        payload: { agentId: agent.id, vapiAssistantId: vapiAssistant.id },
      },
    })

    console.log('\n🎉 Successfully fixed Big Daddy Plumbing!')
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    if (error.stack) console.error(error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

