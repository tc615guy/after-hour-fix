#!/usr/bin/env tsx
import 'dotenv/config'
import { prisma } from '../src/lib/db'
import { createVapiClient, buildAssistantPrompt, buildAssistantTools } from '../src/lib/vapi'

async function main() {
  const projectId = 'demo-plumbing'
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new Error('Demo Plumbing project not found')

  // If agent already exists, skip
  const exists = await prisma.agent.findFirst({ where: { projectId } })
  if (exists) {
    console.log('Agent already exists for Demo Plumbing:', exists.id)
    return
  }

  const vapi = createVapiClient()
  const prompt = buildAssistantPrompt(project.name, project.trade)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const tools = buildAssistantTools(appUrl, projectId)

  const assistant = await vapi.createAssistant({
    name: 'Demo Plumbing AI',
    firstMessage: "Thanks for calling Demo Plumbing! I can help you right away. What's going on?",
    voice: {
      provider: 'cartesia',
      voiceId: 'ec1e269e-9ca0-402f-8a18-58e0e022355a',
      model: 'sonic-3',
      language: 'en',
    },
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [{ role: 'system', content: prompt }],
      tools,
    },
    recordingEnabled: true,
  })

  const agent = await prisma.agent.create({
    data: {
      projectId,
      vapiAssistantId: assistant.id,
      name: 'Demo Plumbing AI',
      voice: 'adam',
      basePrompt: prompt,
    },
  })

  console.log('✅ Created Demo Plumbing assistant')
  console.log('  Agent ID:', agent.id)
  console.log('  Vapi Assistant ID:', assistant.id)
}

main().catch((e)=>{ console.error(e); process.exit(1)}).finally(()=>prisma.$disconnect())

