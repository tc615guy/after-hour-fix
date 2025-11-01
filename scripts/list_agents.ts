import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { prisma } from '@/lib/db'

dotenvConfig({ path: '.env.local' })

async function main() {
  const limit = Number(process.env.LIMIT || 5)
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { project: true },
  })

  if (agents.length === 0) {
    console.log('No agents found.')
    return
  }

  console.log(`Showing ${agents.length} most recent agents:`)
  for (const a of agents) {
    console.log('---')
    console.log('Agent ID:         ', a.id)
    console.log('Name:             ', a.name)
    console.log('Project:          ', `${a.project?.name || a.projectId} (${a.projectId})`)
    console.log('Vapi Assistant ID:', a.vapiAssistantId)
    console.log('Created At:       ', a.createdAt)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

