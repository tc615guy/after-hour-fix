import { prisma } from '@/lib/db'

async function main() {
  // Get recent webhook/event logs
  const events = await prisma.eventLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  console.log('Recent Event Logs:\n')
  for (const event of events) {
    console.log('============================================================')
    console.log(`[${event.createdAt.toISOString()}] ${event.type}`)
    console.log('Payload:', JSON.stringify(event.payload, null, 2))
    console.log()
  }

  // Also check for any recent calls
  const calls = await prisma.call.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  console.log('\nRecent Calls (last 24h):', calls.length)
  for (const call of calls) {
    console.log(`- ${call.vapiCallId}: ${call.status} at ${call.createdAt.toISOString()}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
