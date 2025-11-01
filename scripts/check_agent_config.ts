import 'dotenv/config'
import { prisma } from '../src/lib/db'

async function main() {
  const agent = await prisma.agent.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { project: true }
  })

  if (!agent) {
    console.log('No agent found')
    return
  }

  console.log('Agent Name:', agent.name)
  console.log('Project ID:', agent.projectId)
  console.log('Project Name:', agent.project.name)
  console.log('Project Trade:', agent.project.trade)
  console.log('Vapi Assistant ID:', agent.vapiAssistantId)
  console.log('\nExpected webhook URL:')
  console.log(`${process.env.NEXT_PUBLIC_APP_URL}/api/book?projectId=${agent.projectId}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
