import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantPrompt, buildAssistantTools } from '@/lib/vapi'

dotenvConfig({ path: '.env.local' })

async function main() {
  const agentId = process.env.AGENT_ID
  let agent = null as any
  if (agentId) {
    agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { project: true }
    })
    if (!agent) throw new Error(`Agent not found: ${agentId}`)
  } else {
    agent = await prisma.agent.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { project: true }
    })
    if (!agent) throw new Error('No agents found')
  }

  console.log('Updating assistant:', agent.vapiAssistantId)
  console.log('Agent name:', agent.name)
  console.log('Project:', agent.project.name)

  const vapi = createVapiClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const systemPrompt = buildAssistantPrompt(agent.project.name, agent.project.trade)
  const tools = buildAssistantTools(appUrl, agent.projectId)

  console.log('\nSystem Prompt Length:', systemPrompt.length)
  console.log('Tools configured:', tools.length)
  console.log('App URL:', appUrl)

  // Update the assistant with OpenAI model (better function calling)
  const updated = await vapi.updateAssistant(agent.vapiAssistantId, {
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
      tools,
    },
    voice: {
      provider: '11labs',
      voiceId: 'burt', // Professional, warm male voice
    },
    firstMessage: "Hey there, thanks for calling! I can help you right away. What's going on?",
    recordingEnabled: true,
  })

  console.log('\n✅ Assistant updated successfully!')
  console.log('Voice provider:', updated.voice?.provider)
  console.log('Model:', updated.model?.model)
  console.log('Has tools:', !!(updated.model as any)?.tools?.length)
  console.log('Has system message:', !!(updated.model as any)?.messages?.length)
}

main().catch((e) => {
  console.error('❌ Error:', e.message)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
