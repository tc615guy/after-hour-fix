import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { prisma } from '@/lib/db'
import { createVapiClient } from '@/lib/vapi'

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
  const updated = await vapi.updateAssistant(agent.vapiAssistantId, {
    voice: { provider: 'vapi', voiceId: 'Paige' },
  })

  console.log('Updated assistant voice for', agent.id, '->', updated.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
