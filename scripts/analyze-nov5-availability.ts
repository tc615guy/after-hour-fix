import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL,
    },
  },
})

// Bookings for Nov 5, 2025 from the schedule
const nov5Bookings = [
  { tech: 'Alex R.', techId: 'PL-001', start: '08:35', end: '10:23', name: 'Drain Cleaning – Grace Martinez' },
  { tech: 'Alex R.', techId: 'PL-001', start: '10:45', end: '12:04', name: 'Garbage Disposal Repair – Ethan Williams' },
  { tech: 'Alex R.', techId: 'PL-001', start: '12:40', end: '14:22', name: 'Tankless Water Heater Service – Michael Wilson' },
  { tech: 'Brianna K.', techId: 'PL-002', start: '08:13', end: '10:03', name: 'Sewer Camera Inspection – David Jones' },
  { tech: 'Carlos M.', techId: 'PL-003', start: '08:06', end: '11:59', name: 'Pipe Burst Emergency – Chloe Brown' },
  { tech: 'Carlos M.', techId: 'PL-003', start: '12:34', end: '14:14', name: 'Toilet Replacement – Ryan Martinez' },
  { tech: 'Devon S.', techId: 'PL-004', start: '08:24', end: '09:40', name: 'Garbage Disposal Repair – Ashley Johnson' },
]

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${mins.toString().padStart(2, '0')} ${ampm}`
}

function isTimeInRange(time: number, start: number, end: number): boolean {
  return time >= start && time < end
}

function hasConflict(slotStart: number, slotEnd: number, bookingStart: number, bookingEnd: number): boolean {
  // Conflict if slot overlaps booking: slotStart < bookingEnd AND slotEnd > bookingStart
  return slotStart < bookingEnd && slotEnd > bookingStart
}

async function main() {
  console.log('🔍 Analyzing November 5th, 2025 Availability\n')
  console.log('=' .repeat(70))
  
  console.log('\n📋 Technician Bookings for Nov 5:')
  nov5Bookings.forEach(b => {
    console.log(`   ${b.tech} (${b.techId}): ${b.start} - ${b.end} (${b.name})`)
  })

  // Group bookings by technician
  const techBookings: { [key: string]: Array<{ start: number; end: number }> } = {}
  nov5Bookings.forEach(b => {
    if (!techBookings[b.techId]) {
      techBookings[b.techId] = []
    }
    techBookings[b.techId].push({
      start: parseTime(b.start),
      end: parseTime(b.end),
    })
  })

  console.log('\n' + '='.repeat(70))
  console.log('\n⏰ Checking 30-minute slots from 8:00 AM - 5:00 PM\n')

  const slots: Array<{ time: string; availableTechs: string[]; conflicts: string[] }> = []
  
  // Generate slots every 30 minutes from 8 AM to 5 PM
  for (let hour = 8; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const slotStart = hour * 60 + minute
      const slotEnd = slotStart + 30 // 30-minute slots
      const slotTime = formatTime(slotStart)

      const availableTechs: string[] = []
      const conflicts: string[] = []

      // Check each technician
      const allTechIds = ['PL-001', 'PL-002', 'PL-003', 'PL-004']
      allTechIds.forEach(techId => {
        const bookings = techBookings[techId] || []
        let hasConflictForThisTech = false

        for (const booking of bookings) {
          if (hasConflict(slotStart, slotEnd, booking.start, booking.end)) {
            hasConflictForThisTech = true
            conflicts.push(`${techId} (${formatTime(booking.start)}-${formatTime(booking.end)})`)
            break
          }
        }

        if (!hasConflictForThisTech) {
          availableTechs.push(techId)
        }
      })

      slots.push({
        time: slotTime,
        availableTechs,
        conflicts,
      })
    }
  }

  // Display results
  const availableSlots = slots.filter(s => s.availableTechs.length > 0)
  const unavailableSlots = slots.filter(s => s.availableTechs.length === 0)

  console.log(`✅ AVAILABLE SLOTS (${availableSlots.length} total):\n`)
  availableSlots.forEach((slot, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${slot.time.padEnd(10)} - ${slot.availableTechs.length} tech(s) available: ${slot.availableTechs.join(', ')}`)
    if (slot.conflicts.length > 0) {
      console.log(`    ⚠️  Conflicts: ${slot.conflicts.join(', ')}`)
    }
  })

  console.log(`\n❌ UNAVAILABLE SLOTS (${unavailableSlots.length} total):\n`)
  unavailableSlots.slice(0, 10).forEach(slot => {
    console.log(`   ${slot.time} - ALL TECHNICIANS BUSY`)
    console.log(`      Conflicts: ${slot.conflicts.join(', ')}`)
  })
  if (unavailableSlots.length > 10) {
    console.log(`   ... and ${unavailableSlots.length - 10} more`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n🧪 COMPARING WITH CAL.COM RESULTS:\n')
  
  // Cal.com returned: 9:00 AM - 3:30 PM (14 slots)
  const calcomSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM',
  ]

  console.log('Cal.com returned these slots:')
  calcomSlots.forEach((time, i) => {
    const slot = slots.find(s => s.time.toLowerCase().replace(/\s/g, '') === time.toLowerCase().replace(/\s/g, ''))
    if (slot) {
      const status = slot.availableTechs.length > 0 ? '✅' : '❌'
      console.log(`   ${status} ${time} - ${slot.availableTechs.length > 0 ? `${slot.availableTechs.length} tech(s) available` : 'ALL BUSY'}`)
      if (slot.conflicts.length > 0) {
        console.log(`      Conflicts: ${slot.conflicts.join(', ')}`)
      }
    }
  })

  // Check what SHOULD be available based on actual bookings
  console.log('\n📊 ANALYSIS:\n')
  console.log(`Expected available slots (based on bookings): ${availableSlots.length}`)
  console.log(`Cal.com returned slots: ${calcomSlots.length}`)
  
  // Find slots that Cal.com missed (should be available but weren't returned)
  const missedSlots = availableSlots.filter(s => {
    const timeStr = s.time.toLowerCase().replace(/\s/g, '')
    return !calcomSlots.some(c => c.toLowerCase().replace(/\s/g, '') === timeStr)
  })
  
  if (missedSlots.length > 0) {
    console.log(`\n⚠️  MISSED SLOTS (should be available but Cal.com didn't return):`)
    missedSlots.forEach(s => {
      console.log(`   - ${s.time} (${s.availableTechs.join(', ')} available)`)
    })
  }

  // Check what Cal.com returned that shouldn't be available
  const wrongSlots = calcomSlots.filter(time => {
    const slot = slots.find(s => s.time.toLowerCase().replace(/\s/g, '') === time.toLowerCase().replace(/\s/g, ''))
    return slot && slot.availableTechs.length === 0
  })

  if (wrongSlots.length > 0) {
    console.log(`\n❌ WRONG SLOTS (Cal.com returned but ALL techs are busy):`)
    wrongSlots.forEach(time => {
      const slot = slots.find(s => s.time.toLowerCase().replace(/\s/g, '') === time.toLowerCase().replace(/\s/g, ''))
      console.log(`   - ${time} - ALL TECHNICIANS BUSY`)
    })
  }

  console.log('\n')
  
  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
