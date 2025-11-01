import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { prisma } from '@/lib/db'
import { createVapiClient, VapiAssistantInput } from '@/lib/vapi'

dotenvConfig({ path: '.env.local' })

async function main() {
  const agentId = process.env.AGENT_ID
  let agent = null as any
  if (agentId) {
    agent = await prisma.agent.findUnique({ where: { id: agentId } })
    if (!agent) throw new Error(`Agent not found: ${agentId}`)
  } else {
    agent = await prisma.agent.findFirst({ orderBy: { createdAt: 'desc' } })
    if (!agent) throw new Error('No agents found')
  }

  const vapi = createVapiClient()
  // Try Vapi realtime provider; if that fails we can try another next.
  const updated = await vapi.updateAssistant(agent.vapiAssistantId, {
    model: { provider: 'vapi', model: 'gpt-4o-realtime-preview' },
  } as Partial<VapiAssistantInput>)

  console.log('Updated assistant model for', agent.id, '->', updated.id, 'provider=vapi model=gpt-4o-realtime-preview')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

