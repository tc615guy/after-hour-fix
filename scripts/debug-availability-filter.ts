import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL,
    },
  },
})

async function main() {
  console.log('🔍 Debugging Availability Filter for Big Al\'s Plumbing\n')
  
  // Find Big Al's Plumbing
  const project = await prisma.project.findFirst({
    where: {
      name: {
        contains: 'Big Al',
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!project) {
    console.log('❌ Project not found')
    return
  }

  console.log(`✅ Found project: ${project.name} (${project.id})\n`)

  // Get all active technicians
  const technicians = await prisma.technician.findMany({
    where: {
      projectId: project.id,
      isActive: true,
      deletedAt: null,
    },
    include: {
      bookings: {
        where: {
          deletedAt: null,
          status: { in: ['pending', 'booked', 'en_route'] },
          slotStart: { not: null },
        },
      },
    },
  })

  console.log(`📋 Technicians (${technicians.length}):\n`)
  technicians.forEach(tech => {
    console.log(`   ${tech.name} (ID: ${tech.id})`)
    console.log(`      Bookings: ${tech.bookings.length}`)
    tech.bookings.forEach(b => {
      const start = b.slotStart ? new Date(b.slotStart).toLocaleString('en-US', { timeZone: 'America/Chicago' }) : 'NO START'
      const end = b.slotEnd ? new Date(b.slotEnd).toLocaleString('en-US', { timeZone: 'America/Chicago' }) : 'NO END'
      console.log(`         - ${b.customerName}: ${start} - ${end} (status: ${b.status})`)
    })
  })

  // Check for Nov 5, 2025 bookings
  const nov5Start = new Date('2025-11-05T00:00:00-06:00') // CST
  const nov5End = new Date('2025-11-06T00:00:00-06:00')

  console.log(`\n📅 Checking bookings for Nov 5, 2025 (${nov5Start.toISOString()} to ${nov5End.toISOString()}):\n`)

  const nov5Bookings = await prisma.booking.findMany({
    where: {
      projectId: project.id,
      deletedAt: null,
      status: { notIn: ['canceled', 'failed'] }, // Same filter as availability API
      AND: [
        { slotStart: { not: null } },
        { slotStart: { gte: nov5Start } },
        { slotStart: { lt: nov5End } },
      ],
    },
    include: {
      technician: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  console.log(`   Found ${nov5Bookings.length} bookings for Nov 5:\n`)
  nov5Bookings.forEach(b => {
    const start = b.slotStart ? new Date(b.slotStart).toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true }) : 'NO START'
    const end = b.slotEnd ? new Date(b.slotEnd).toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true }) : 'NO END (WILL USE DEFAULT 90 MIN)'
    const techName = b.technician ? b.technician.name : 'NO TECH ASSIGNED'
    console.log(`   - ${b.customerName}: ${start} - ${end} (Tech: ${techName}, Status: ${b.status})`)
  })

  // Now simulate what the availability API does
  console.log(`\n🧪 Simulating Availability API Conflict Detection:\n`)

  // Get technicians WITH bookings for Nov 5
  const techsWithBookings = await prisma.technician.findMany({
    where: {
      projectId: project.id,
      isActive: true,
      deletedAt: null,
    },
    include: {
      bookings: {
        where: {
          AND: [
            { slotStart: { not: null } },
            { slotStart: { lt: nov5End } },
            {
              OR: [
                { slotEnd: { gt: nov5Start } },
                { slotEnd: null },
              ],
            },
          ],
          status: { notIn: ['canceled', 'failed'] }, // Same filter as availability API
          deletedAt: null,
        },
      },
    },
  })

  console.log(`   Technicians checked: ${techsWithBookings.length}`)
  techsWithBookings.forEach(tech => {
    console.log(`   - ${tech.name}: ${tech.bookings.length} bookings in range`)
  })

  // Test a few slots
  const testSlots = [
    { time: '09:00', iso: '2025-11-05T09:00:00-06:00' },
    { time: '09:30', iso: '2025-11-05T09:30:00-06:00' },
    { time: '10:00', iso: '2025-11-05T10:00:00-06:00' },
    { time: '11:00', iso: '2025-11-05T11:00:00-06:00' },
    { time: '16:00', iso: '2025-11-05T16:00:00-06:00' },
  ]

  console.log(`\n   Testing slot conflict detection:\n`)
  for (const slot of testSlots) {
    const slotStart = new Date(slot.iso)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000) // 30 min slots

    let availableTechs: string[] = []
    for (const tech of techsWithBookings) {
      const isConflicted = tech.bookings.some((b) => {
        if (!b.slotStart) return false
        const bStart = new Date(b.slotStart)
        const bEnd = b.slotEnd ? new Date(b.slotEnd) : new Date(bStart.getTime() + 90 * 60 * 1000)
        const overlaps = slotStart < bEnd && slotEnd > bStart
        if (overlaps) {
          console.log(`      ${slot.time}: ${tech.name} CONFLICTS with ${b.customerName} (${bStart.toLocaleTimeString()}-${bEnd.toLocaleTimeString()})`)
        }
        return overlaps
      })

      if (!isConflicted) {
        availableTechs.push(tech.name)
      }
    }

    console.log(`   ${slot.time}: ${availableTechs.length > 0 ? `✅ ${availableTechs.length} tech(s) available: ${availableTechs.join(', ')}` : '❌ ALL BUSY'}`)
  }

  console.log('\n')
  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
