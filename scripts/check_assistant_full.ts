import 'dotenv/config'
import { prisma } from '../src/lib/db'
import { createVapiClient } from '../src/lib/vapi'

async function main() {
  const agent = await prisma.agent.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { project: true }
  })

  if (!agent) throw new Error('No agents found')

  const vapi = createVapiClient()
  const assistant = await vapi.getAssistant(agent.vapiAssistantId)

  console.log('Full assistant config:')
  console.log(JSON.stringify(assistant, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
