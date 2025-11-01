import { prisma } from '../src/lib/db'

const KL_PROJECT_ID = 'cmhf7cywj00017kkwa14j6l53'

async function main() {
  console.log('🔍 Checking KL Electric Event Logs\n')

  const events = await prisma.eventLog.findMany({
    where: {
      projectId: KL_PROJECT_ID
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20
  })

  console.log(`Found ${events.length} event log(s):\n`)

  events.forEach((event, i) => {
    console.log(`Event #${i + 1}:`)
    console.log(`  Type: ${event.type}`)
    console.log(`  Created: ${event.createdAt}`)
    console.log(`  Payload:`, JSON.stringify(event.payload, null, 2))
    console.log('')
  })

  await prisma.$disconnect()
}

main()
