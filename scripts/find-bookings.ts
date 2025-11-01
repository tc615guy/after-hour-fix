import { prisma } from '../src/lib/db'

async function main() {
  console.log('🔍 Searching for ALL Bookings\n')

  // Search by the booking IDs from event logs
  const bookingIds = [
    'cmhfhkmyf00057kac95fki3gm',
    'cmhfhk2ja00027kacig9evl4o'
  ]

  for (const id of bookingIds) {
    const booking = await prisma.booking.findUnique({
      where: { id }
    })

    if (booking) {
      console.log(`Found booking ${id}:`)
      console.log(`  Project ID: ${booking.projectId}`)
      console.log(`  Customer: ${booking.customerName}`)
      console.log(`  Phone: ${booking.customerPhone}`)
      console.log(`  Address: ${booking.address}`)
      console.log(`  Slot: ${booking.slotStart}`)
      console.log(`  Status: ${booking.status}`)
      console.log('')
    } else {
      console.log(`❌ Booking ${id} NOT FOUND (may have been deleted)`)
      console.log('')
    }
  }

  // Also check all bookings to see what exists
  const allBookings = await prisma.booking.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  })

  console.log(`\nAll recent bookings in database: ${allBookings.length}`)
  allBookings.forEach((b, i) => {
    console.log(`${i + 1}. ${b.id} - ${b.projectId} - ${b.customerName} - ${b.slotStart}`)
  })

  await prisma.$disconnect()
}

main()
