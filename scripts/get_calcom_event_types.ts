import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import axios from 'axios'

dotenvConfig({ path: '.env.local' })

async function main() {
  const apiKey = process.env.CALCOM_API_KEY
  const baseUrl = process.env.CALCOM_BASE_URL || 'https://api.cal.com/v2'

  if (!apiKey) {
    console.error('❌ CALCOM_API_KEY not found in environment')
    process.exit(1)
  }

  console.log('Fetching your Cal.com event types...\n')

  try {
    // Get user info first
    const meResponse = await axios.get(`${baseUrl}/me`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    const user = meResponse.data.data || meResponse.data
    console.log('✅ Connected as:', user.email || user.username)
    console.log('User ID:', user.id)
    console.log()

    // Get event types
    const eventTypesResponse = await axios.get(`${baseUrl}/event-types`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    const eventTypes = eventTypesResponse.data.data || eventTypesResponse.data || []

    console.log(`Found ${eventTypes.length} event types:\n`)
    console.log('============================================================')

    for (const et of eventTypes) {
      console.log(`\nEvent Type: ${et.title || et.name}`)
      console.log(`ID: ${et.id}`)
      console.log(`Length: ${et.length} minutes`)
      console.log(`Slug: ${et.slug}`)
      if (et.description) {
        console.log(`Description: ${et.description}`)
      }
      console.log('---')
    }

    console.log('\n============================================================')
    console.log('\n✅ To use an event type, add this to your .env:')
    if (eventTypes.length > 0) {
      console.log(`CALCOM_EVENT_TYPE_ID=${eventTypes[0].id}`)
    }

  } catch (error: any) {
    console.error('\n❌ Error fetching event types:')
    console.error('Status:', error.response?.status)
    console.error('Message:', error.response?.data?.message || error.message)
    console.error('\nFull error:', JSON.stringify(error.response?.data, null, 2))
  }
}

main()
