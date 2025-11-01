import { prisma } from '../src/lib/db'

const KL_PROJECT_ID = 'cmhf7cywj00017kkwa14j6l53'

async function main() {
  console.log('🔍 Checking KL Electric Bookings\n')

  const bookings = await prisma.booking.findMany({
    where: {
      projectId: KL_PROJECT_ID
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  console.log(`Found ${bookings.length} booking(s):\n`)

  bookings.forEach((booking, i) => {
    console.log(`Booking #${i + 1}:`)
    console.log(`  ID: ${booking.id}`)
    console.log(`  Customer Name: ${booking.customerName || 'N/A'}`)
    console.log(`  Customer Phone: ${booking.customerPhone || 'N/A'}`)
    console.log(`  Customer Email: ${booking.customerEmail || 'N/A'}`)
    console.log(`  Address: ${booking.address || 'N/A'}`)
    console.log(`  Notes: ${booking.notes || 'N/A'}`)
    console.log(`  Slot Start: ${booking.slotStart}`)
    console.log(`  Slot End: ${booking.slotEnd}`)
    console.log(`  Status: ${booking.status}`)
    console.log(`  Price: ${booking.priceCents ? `$${(booking.priceCents / 100).toFixed(2)}` : 'N/A'}`)
    console.log(`  Is Emergency: ${booking.isEmergency}`)
    console.log(`  Call ID: ${booking.callId || 'N/A'}`)
    console.log(`  Created: ${booking.createdAt}`)
    console.log('')
  })

  // Calculate stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const callsToday = await prisma.call.count({
    where: {
      projectId: KL_PROJECT_ID,
      createdAt: {
        gte: today
      }
    }
  })

  const thisWeekStart = new Date()
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
  thisWeekStart.setHours(0, 0, 0, 0)

  const bookingsThisWeek = await prisma.booking.count({
    where: {
      projectId: KL_PROJECT_ID,
      createdAt: {
        gte: thisWeekStart
      }
    }
  })

  const agent = await prisma.agent.findFirst({
    where: {
      projectId: KL_PROJECT_ID
    }
  })

  console.log('=== DASHBOARD METRICS ===')
  console.log(`Calls Today: ${callsToday}`)
  console.log(`Bookings This Week: ${bookingsThisWeek}`)
  console.log(`AI Minutes Used: ${agent?.minutesThisPeriod || 0}`)
  console.log('')

  await prisma.$disconnect()
}

main()
