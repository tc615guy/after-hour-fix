import 'dotenv/config'
import axios from 'axios'

async function main() {
  const apiKey = 'cal_live_d8a2c04bca21c7036335456c0a0d788e'
  const eventTypeId = 3769536
  const userId = 1875632 // josh-lanius-hnue4f
  const baseUrl = 'https://api.cal.com/v1'

  console.log('Attempting to fix Cal.com event type hosts...\n')

  try {
    // First get the user's default schedule
    console.log('Step 1: Fetching user schedules...')
    const schedulesResponse = await axios.get(`${baseUrl}/schedules`, {
      params: { apiKey }
    })

    const userSchedules = schedulesResponse.data.schedules
    console.log('Found', userSchedules.length, 'schedules')

    const defaultSchedule = userSchedules.find((s: any) => s.isDefault) || userSchedules[0]
    const scheduleId = defaultSchedule?.id || 1007524 // fallback to event's schedule

    console.log('Using schedule ID:', scheduleId)

    // Try to update the event type to add the owner as a host
    console.log('\nStep 2: Updating event type to add user as host...')

    const updateData = {
      hosts: [
        {
          userId: userId,
          scheduleId: scheduleId,
          isFixed: true // Makes this user always available for this event
        }
      ]
    }

    console.log('Update payload:', JSON.stringify(updateData, null, 2))

    const response = await axios.patch(
      `${baseUrl}/event-types/${eventTypeId}`,
      updateData,
      {
        params: { apiKey },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('\n✅ SUCCESS! Event type updated.')
    console.log('\nUpdated event type:')
    console.log('ID:', response.data.event_type.id)
    console.log('Title:', response.data.event_type.title)
    console.log('Hosts:', response.data.event_type.hosts)

    console.log('\n✅ Now try making another test call!')

  } catch (error: any) {
    console.error('\n❌ Error updating event type:')
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Data:', JSON.stringify(error.response.data, null, 2))

      if (error.response.status === 400 || error.response.status === 403) {
        console.log('\n⚠️ The API does not allow updating hosts via PATCH.')
        console.log('\nMANUAL FIX REQUIRED:')
        console.log('1. Go to: https://cal.com/event-types/3769536')
        console.log('2. Click "Edit"')
        console.log('3. Look for "Assigned to" or "Hosts" section')
        console.log('4. Add yourself (josh-lanius-hnue4f) as a host')
        console.log('5. Click "Save"')
        console.log('\nOR try this alternative:')
        console.log('1. Create a NEW event type')
        console.log('2. Make sure YOU are selected as the host')
        console.log('3. Copy the new event type ID')
        console.log('4. Update your .env CALCOM_EVENT_TYPE_ID with the new ID')
      }
    } else {
      console.error(error.message)
    }
  }
}

main()
