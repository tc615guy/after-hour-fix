import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantPrompt, buildAssistantTools } from '@/lib/vapi'

// Prefer .env.local for dev convenience if present
dotenvConfig({ path: '.env.local' })

async function main() {
  const projectId = process.env.TEST_PROJECT_ID || 'demo-project'
  const voice = process.env.TEST_VOICE || 'burt'
  const name = process.env.TEST_AGENT_NAME || `Test Agent ${Date.now()}`

  console.log('Verifying /api/agents logic…')
  console.log('Project ID:', projectId)

  // Ensure project exists
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    throw new Error(`Project not found: ${projectId}. Seed or create a project first.`)
  }

  const vapiClient = createVapiClient()
  const systemPrompt = buildAssistantPrompt(project.name, project.trade)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const tools = buildAssistantTools(appUrl)

  const assistant = await vapiClient.createAssistant({
    name,
    firstMessage:
      "Hey there, thanks for calling! I can help you right away. What's going on?",
    voice: {
      provider: '11labs',
      voiceId: voice,
    },
    model: {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
      tools,
    },
    recordingEnabled: true,
  })

  console.log('Assistant created (may be mock):', assistant.id)

  const agent = await prisma.agent.create({
    data: {
      projectId: project.id,
      vapiAssistantId: assistant.id,
      name,
      voice,
      basePrompt: systemPrompt,
    },
  })

  console.log('Agent DB record created:', agent.id)
}

main()
  .catch((e) => {
    console.error('Verification failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
