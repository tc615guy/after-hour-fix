import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { prisma } from '@/lib/db'

dotenvConfig({ path: '.env.local' })

async function main() {
  // Get recent calls
  const calls = await prisma.call.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      project: true,
      agent: true,
      bookings: true,
    }
  })

  console.log('Recent Calls:', calls.length)
  console.log('')

  for (const call of calls) {
    console.log('='.repeat(60))
    console.log('Call ID:', call.id)
    console.log('Vapi Call ID:', call.vapiCallId)
    console.log('Created:', call.createdAt)
    console.log('Status:', call.status)
    console.log('Direction:', call.direction)
    console.log('From:', call.fromNumber)
    console.log('To:', call.toNumber)
    console.log('Duration:', call.durationSec ? `${call.durationSec}s` : 'N/A')
    console.log('Project:', call.project?.name || 'N/A')
    console.log('Agent:', call.agent?.name || 'N/A')
    console.log('Intent:', call.intent || 'N/A')
    console.log('Confidence:', call.voiceConfidence?.toFixed(2) || 'N/A')
    console.log('Escalated:', call.escalated)
    console.log('Bookings:', call.bookings.length)
    console.log('')
    console.log('Transcript:')
    console.log(call.transcript || 'No transcript yet')
    console.log('')
  }

  // Get recent event logs
  console.log('='.repeat(60))
  console.log('Recent Event Logs:')
  console.log('')

  const events = await prisma.eventLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  for (const event of events) {
    console.log(`[${event.createdAt.toISOString()}] ${event.type}`)
    console.log('Payload:', JSON.stringify(event.payload, null, 2))
    console.log('')
  }
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
