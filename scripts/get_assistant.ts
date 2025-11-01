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
  const a = await vapi.getAssistant(agent.vapiAssistantId)
  console.log('Assistant ID:', a.id)
  console.log('Name:', a.name)
  console.log('Voice:', JSON.stringify(a.voice, null, 2))
  console.log('Model:', JSON.stringify(a.model, null, 2))
  console.log('First Message:', a.firstMessage)
  console.log('\nFull Assistant Config:')
  console.log(JSON.stringify(a, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})

