import { prisma } from '@/lib/db'

async function main() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  console.log(`\nTotal recent bookings: ${bookings.length}\n`)

  for (const booking of bookings) {
    console.log('============================================================')
    console.log(`Booking ID: ${booking.id}`)
    console.log(`Customer: ${booking.customerName}`)
    console.log(`Phone: ${booking.customerPhone}`)
    console.log(`Address: ${booking.address}`)
    console.log(`Time: ${booking.slotStart ? booking.slotStart.toISOString() : 'N/A'}`)
    console.log(`Notes: ${booking.notes}`)
    console.log(`Status: ${booking.status}`)
    console.log(`Created: ${booking.createdAt.toISOString()}`)
    console.log()
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
