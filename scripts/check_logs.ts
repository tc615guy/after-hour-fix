import { prisma } from '@/lib/db'

async function main() {
  console.log('Checking recent function call logs...\n')

  // Get recent event logs for function calls
  const events = await prisma.eventLog.findMany({
    where: {
      type: {
        startsWith: 'vapi.function_call'
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  console.log(`Found ${events.length} recent function calls:\n`)

  for (const event of events) {
    console.log('============================================================')
    console.log(`Time: ${event.createdAt.toISOString()}`)
    console.log(`Type: ${event.type}`)
    console.log('Payload:')
    console.log(JSON.stringify(event.payload, null, 2))
    console.log()
  }

  // Check recent calls
  const calls = await prisma.call.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      bookings: true,
    }
  })

  console.log('\n============================================================')
  console.log('Recent Calls (last hour):', calls.length)
  for (const call of calls) {
    console.log(`\nCall ${call.vapiCallId}:`)
    console.log(`  Status: ${call.status}`)
    console.log(`  From: ${call.fromNumber}`)
    console.log(`  Bookings: ${call.bookings.length}`)
    if (call.transcript) {
      console.log(`  Transcript preview: ${call.transcript.substring(0, 200)}...`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
