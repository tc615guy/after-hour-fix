import 'dotenv/config'
import axios from 'axios'

async function main() {
  const apiKey = 'cal_live_d8a2c04bca21c7036335456c0a0d788e'
  const eventTypeId = 3769536
  const baseUrl = 'https://api.cal.com/v1'

  console.log('Fetching event type details from Cal.com...\n')

  try {
    // Get event type details
    const response = await axios.get(`${baseUrl}/event-types/${eventTypeId}`, {
      params: { apiKey }
    })

    const eventType = response.data.event_type

    console.log('=== EVENT TYPE DETAILS ===')
    console.log('ID:', eventType.id)
    console.log('Title:', eventType.title)
    console.log('Slug:', eventType.slug)
    console.log('Length:', eventType.length, 'minutes')
    console.log('Active:', eventType.hidden ? 'NO (hidden)' : 'YES')
    console.log('\n=== SCHEDULING ===')
    console.log('Schedule ID:', eventType.scheduleId || 'NOT SET')
    console.log('\n=== TEAM/USERS ===')
    console.log('Team ID:', eventType.teamId || 'NOT SET (individual event)')
    console.log('User ID:', eventType.userId || 'NOT SET')
    console.log('Users assigned:', eventType.users?.length || 0)

    if (eventType.users && eventType.users.length > 0) {
      console.log('\nAssigned users:')
      eventType.users.forEach((user: any, idx: number) => {
        console.log(`  ${idx + 1}. ${user.name || user.username || 'Unknown'} (ID: ${user.id})`)
      })
    } else {
      console.log('\n⚠️ WARNING: No users assigned to this event type!')
    }

    console.log('\n=== FULL RESPONSE ===')
    console.log(JSON.stringify(eventType, null, 2))

  } catch (error: any) {
    console.error('❌ Error fetching event type:')
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Data:', JSON.stringify(error.response.data, null, 2))
    } else {
      console.error(error.message)
    }
  }
}

main()
