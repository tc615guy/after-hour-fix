import { prisma } from '../src/lib/db'

const KL_PROJECT_ID = 'cmhf7cywj00017kkwa14j6l53'

async function main() {
  console.log('🔍 Checking KL Electric Call Activity\n')

  // Get all calls for KL Electric
  const calls = await prisma.call.findMany({
    where: {
      projectId: KL_PROJECT_ID
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  })

  console.log(`Total calls found: ${calls.length}\n`)

  if (calls.length > 0) {
    calls.forEach((call, i) => {
      console.log(`Call #${i + 1}:`)
      console.log(`  Vapi Call ID: ${call.vapiCallId}`)
      console.log(`  From: ${call.fromNumber}`)
      console.log(`  To: ${call.toNumber}`)
      console.log(`  Status: ${call.status}`)
      console.log(`  Duration: ${call.durationSec}s`)
      console.log(`  Created: ${call.createdAt}`)
      console.log(`  Transcript: ${call.transcript?.substring(0, 100) || 'N/A'}`)
      console.log('')
    })
  } else {
    console.log('❌ No calls found for KL Electric')
    console.log('\nThis means:')
    console.log('  1. No calls have been received, OR')
    console.log('  2. Webhook is not sending data to the server')
  }

  // Check for bookings
  const bookings = await prisma.booking.findMany({
    where: {
      projectId: KL_PROJECT_ID
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  })

  console.log(`\nBookings found: ${bookings.length}`)

  if (bookings.length > 0) {
    bookings.forEach((booking, i) => {
      console.log(`\nBooking #${i + 1}:`)
      console.log(`  Customer: ${booking.customerName}`)
      console.log(`  Phone: ${booking.customerPhone}`)
      console.log(`  Address: ${booking.address}`)
      console.log(`  Slot: ${booking.slotStart}`)
      console.log(`  Status: ${booking.status}`)
    })
  }

  // Check event logs
  const eventLogs = await prisma.eventLog.findMany({
    where: {
      projectId: KL_PROJECT_ID
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20
  })

  console.log(`\nEvent logs found: ${eventLogs.length}`)

  if (eventLogs.length > 0) {
    eventLogs.forEach((log, i) => {
      console.log(`  ${i + 1}. ${log.type} - ${log.createdAt}`)
    })
  }

  await prisma.$disconnect()
}

main()
