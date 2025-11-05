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
  console.log('🔍 Testing November 6th, 2025 Availability for Big Al\'s Plumbing\n')
  console.log('=' .repeat(70))
  
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
      calcomApiKey: true,
      calcomUser: true,
      calcomEventTypeId: true,
      timezone: true,
      businessHours: true,
    },
  })

  if (!project) {
    console.log('❌ Project not found')
    return
  }

  console.log(`✅ Project: ${project.name} (${project.id})`)
  console.log(`   Timezone: ${project.timezone}\n`)

  // Check for Nov 6, 2025 bookings
  const nov6Start = new Date('2025-11-06T00:00:00-06:00') // CST
  const nov6End = new Date('2025-11-07T00:00:00-06:00')

  console.log(`📅 Checking bookings for November 6th, 2025:\n`)

  const nov6Bookings = await prisma.booking.findMany({
    where: {
      projectId: project.id,
      deletedAt: null,
      status: { notIn: ['canceled', 'failed'] },
      AND: [
        { slotStart: { not: null } },
        { slotStart: { gte: nov6Start } },
        { slotStart: { lt: nov6End } },
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
    orderBy: {
      slotStart: 'asc',
    },
  })

  console.log(`   Found ${nov6Bookings.length} bookings:\n`)
  nov6Bookings.forEach((b, i) => {
    const start = b.slotStart ? new Date(b.slotStart).toLocaleString('en-US', { 
      timeZone: 'America/Chicago', 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    }) : 'NO START'
    const end = b.slotEnd ? new Date(b.slotEnd).toLocaleString('en-US', { 
      timeZone: 'America/Chicago', 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    }) : 'NO END'
    const techName = b.technician ? b.technician.name : 'NO TECH ASSIGNED'
    console.log(`   ${i + 1}. ${b.customerName}`)
    console.log(`      ${start} - ${end} (${techName}, Status: ${b.status})`)
  })

  // Simulate conflict detection
  console.log(`\n` + '='.repeat(70))
  console.log(`\n⏰ Testing 30-minute slots from 8:00 AM - 5:00 PM\n`)

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
            { slotStart: { lt: nov6End } },
            {
              OR: [
                { slotEnd: { gt: nov6Start } },
                { slotEnd: null },
              ],
            },
          ],
          status: { notIn: ['canceled', 'failed'] },
          deletedAt: null,
        },
      },
    },
  })

  console.log(`   Technicians: ${techsWithBookings.length}`)
  techsWithBookings.forEach(tech => {
    console.log(`   - ${tech.name}: ${tech.bookings.length} bookings in range`)
  })

  // Generate slots and test conflicts
  const slots: Array<{ time: string; availableTechs: string[] }> = []
  
  for (let hour = 8; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const slotStart = new Date(`2025-11-06T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00-06:00`)
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)

      const availableTechs: string[] = []
      
      for (const tech of techsWithBookings) {
        const isConflicted = tech.bookings.some((b) => {
          if (!b.slotStart) return false
          const bStart = new Date(b.slotStart)
          const bEnd = b.slotEnd ? new Date(b.slotEnd) : new Date(bStart.getTime() + 90 * 60 * 1000)
          return slotStart < bEnd && slotEnd > bStart
        })

        if (!isConflicted) {
          availableTechs.push(tech.name)
        }
      }

      const timeStr = slotStart.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago',
      })

      slots.push({ time: timeStr, availableTechs })
    }
  }

  const availableSlots = slots.filter(s => s.availableTechs.length > 0)
  const unavailableSlots = slots.filter(s => s.availableTechs.length === 0)

  console.log(`\n✅ AVAILABLE SLOTS (${availableSlots.length} total):\n`)
  availableSlots.forEach((slot, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${slot.time.padEnd(10)} - ${slot.availableTechs.length} tech(s): ${slot.availableTechs.join(', ')}`)
  })

  console.log(`\n❌ UNAVAILABLE SLOTS (${unavailableSlots.length} total):\n`)
  unavailableSlots.forEach(slot => {
    console.log(`   ${slot.time} - ALL BUSY`)
  })

  // Now test the actual API endpoint
  console.log(`\n` + '='.repeat(70))
  console.log(`\n🧪 Testing Internal Availability API Endpoint:\n`)

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const startIso = nov6Start.toISOString()
    const endIso = nov6End.toISOString()
    const url = `${appUrl}/api/calcom/availability?projectId=${project.id}&start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`

    console.log(`   Calling: ${url}\n`)

    const res = await fetch(url)
    const data = await res.json()

    console.log(`   Status: ${res.status} ${res.statusText}\n`)

    if (data.slots && Array.isArray(data.slots)) {
      console.log(`📋 API Returned ${data.slots.length} Available Slots:\n`)
      
      // Filter to Nov 6 slots only
      const nov6Slots = data.slots.filter((slot: any) => {
        const slotDate = new Date(slot.start)
        return slotDate >= nov6Start && slotDate < nov6End
      })

      console.log(`   Nov 6 slots: ${nov6Slots.length}\n`)
      
      nov6Slots.forEach((slot: any, index: number) => {
        const slotDate = new Date(slot.start)
        const formatted = slotDate.toLocaleString('en-US', {
          timeZone: 'America/Chicago',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        console.log(`   ${index + 1}. ${formatted}`)
      })

      if (data.result) {
        console.log(`\n💬 AI Message:`)
        console.log(`   ${data.result}\n`)
      }

      // Compare with expected
      console.log(`📊 COMPARISON:\n`)
      console.log(`   Expected available slots (from bookings): ${availableSlots.length}`)
      console.log(`   API returned slots for Nov 6: ${nov6Slots.length}`)

      // Check which slots API missed
      const apiTimes = nov6Slots.map((s: any) => {
        const d = new Date(s.start)
        return d.toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/Chicago',
        })
      })

      const missedSlots = availableSlots.filter(s => {
        const timeStr = s.time.toLowerCase().replace(/\s/g, '')
        return !apiTimes.some((apiTime: string) => 
          apiTime.toLowerCase().replace(/\s/g, '') === timeStr
        )
      })

      if (missedSlots.length > 0) {
        console.log(`\n⚠️  MISSED SLOTS (should be available):`)
        missedSlots.slice(0, 10).forEach(s => {
          console.log(`   - ${s.time} (${s.availableTechs.join(', ')})`)
        })
      }

      // Check which slots API returned but shouldn't be available
      const wrongSlots = nov6Slots.filter((s: any) => {
        const d = new Date(s.start)
        const timeStr = d.toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/Chicago',
        })
        const expected = slots.find(slot => slot.time.toLowerCase().replace(/\s/g, '') === timeStr.toLowerCase().replace(/\s/g, ''))
        return expected && expected.availableTechs.length === 0
      })

      if (wrongSlots.length > 0) {
        console.log(`\n❌ WRONG SLOTS (API returned but all techs are busy):`)
        wrongSlots.forEach((s: any) => {
          const d = new Date(s.start)
          const timeStr = d.toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Chicago',
          })
          console.log(`   - ${timeStr}`)
        })
      }

    } else {
      console.log(`❌ Unexpected API response format:`)
      console.log(JSON.stringify(data, null, 2))
    }
  } catch (error: any) {
    console.log(`\n❌ Error calling API:`)
    console.log(`   ${error.message}`)
    console.log(`\n   Note: Make sure Next.js dev server is running on ${process.env.NEXT_PUBLIC_APP_URL || 'localhost:3000'}`)
  }

  console.log('\n')
  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
