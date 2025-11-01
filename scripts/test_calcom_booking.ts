import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { createCalComClient } from '@/lib/calcom'

dotenvConfig({ path: '.env.local' })

async function main() {
  const apiKey = process.env.CALCOM_API_KEY
  if (!apiKey) {
    console.error('❌ CALCOM_API_KEY not found')
    return
  }

  const client = createCalComClient(apiKey)

  console.log('Testing Cal.com booking...\n')

  // Test booking data - tomorrow at 2 PM
  const tomorrow2pm = new Date()
  tomorrow2pm.setDate(tomorrow2pm.getDate() + 1)
  tomorrow2pm.setHours(14, 0, 0, 0)

  const tomorrow3pm = new Date(tomorrow2pm)
  tomorrow3pm.setHours(15, 0, 0, 0)

  const bookingData = {
    start: tomorrow2pm.toISOString(),
    end: tomorrow3pm.toISOString(),
    attendee: {
      name: 'Test Customer',
      email: 'test@example.com',
      timeZone: 'America/Chicago',
      phoneNumber: '+15551234567',
    },
    title: 'Plumbing Service - Test Customer',
    description: 'Test booking from AfterHourFix',
    location: 'Customer Location',
  }

  console.log('Booking data:', JSON.stringify(bookingData, null, 2))
  console.log()

  try {
    const result = await client.createBooking(bookingData)
    console.log('\n✅ Booking created successfully!')
    console.log('Booking ID:', result.id)
    console.log('Booking UID:', result.uid)
    console.log('Status:', result.status)
    console.log('Start:', result.startTime)
    console.log('End:', result.endTime)
  } catch (error: any) {
    console.error('\n❌ Booking failed:', error.message)
  }
}

main()
