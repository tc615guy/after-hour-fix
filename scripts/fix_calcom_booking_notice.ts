import 'dotenv/config'
import axios from 'axios'

async function main() {
  const apiKey = 'cal_live_d8a2c04bca21c7036335456c0a0d788e'
  const eventTypeId = 3769536
  const baseUrl = 'https://api.cal.com/v1'

  console.log('Fixing Cal.com minimum booking notice...\n')

  try {
    // Update the event type to allow immediate bookings (0 minutes notice)
    const response = await axios.patch(
      `${baseUrl}/event-types/${eventTypeId}`,
      {
        minimumBookingNotice: 0  // Allow immediate bookings
      },
      {
        params: { apiKey },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('✅ SUCCESS! Updated event type')
    console.log('\nBefore: minimumBookingNotice = 120 minutes (2 hours)')
    console.log('After:  minimumBookingNotice = 0 minutes (immediate bookings allowed)')
    console.log('\n✅ Emergency/same-day bookings are now enabled!')

  } catch (error: any) {
    console.error('\n❌ Error updating event type:')
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Data:', JSON.stringify(error.response.data, null, 2))
    } else {
      console.error(error.message)
    }
  }
}

main()
