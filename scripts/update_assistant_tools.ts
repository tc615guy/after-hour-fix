import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantTools } from '@/lib/vapi'

dotenvConfig({ path: '.env.local' })

async function main() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const agentId = process.env.AGENT_ID

  let agent = null as any
  if (agentId) {
    agent = await prisma.agent.findUnique({ where: { id: agentId } })
    if (!agent) throw new Error(`Agent not found: ${agentId}`)
  } else {
    agent = await prisma.agent.findFirst({ orderBy: { createdAt: 'desc' } })
    if (!agent) throw new Error('No agents found')
  }

  const tools = buildAssistantTools(appUrl, agent.projectId)
  const vapi = createVapiClient()
  const current = await vapi.getAssistant(agent.vapiAssistantId)
  const provider = current?.model?.provider || 'groq'
  const modelName = current?.model?.model || 'llama-3.3-70b-versatile'
  const updated = await vapi.updateAssistant(agent.vapiAssistantId, {
    model: { provider, model: modelName, tools },
  })

  console.log('Updated assistant tools for', agent.id, '->', updated.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
