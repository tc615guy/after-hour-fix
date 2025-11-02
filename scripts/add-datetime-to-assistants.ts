#!/usr/bin/env tsx

import 'dotenv/config'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'

const ASSISTANTS = {
  'JL Plumbing': 'bb2dd9f1-50b6-49e9-a848-7d03031ea845',
  'Demo Plumbing': '66ac9a80-cee3-4084-95fa-c51ede8ccf5c',
  'Demo HVAC': 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f',
  'Demo Electrical': 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5',
}

async function updateAssistant(name: string, id: string) {
  console.log(`\n📝 Updating ${name}...`)

  try {
    const response = await fetch(`${VAPI_BASE_URL}/assistant/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Current date and time: {{now}}

You have access to the current date and time through the {{now}} variable above.

When scheduling appointments:
- "Today" means the current date shown above
- "Tomorrow" means the next day
- "Later this week" means within the next 7 days

Always reference the current date/time when discussing scheduling.`
            }
          ]
        },
        variableValues: {
          now: new Date().toLocaleString('en-US', {
            timeZone: 'America/Chicago',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short'
          })
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const updated = await response.json()

    console.log(`   ✅ Updated successfully`)
    console.log(`   Date/Time variable added`)

    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🕐 Adding Date/Time Context to All Assistants\n')

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  })

  console.log(`Current time: ${now}`)
  console.log('\nThis will be passed to assistants via {{now}} variable.')
  console.log('')

  let successCount = 0

  for (const [name, id] of Object.entries(ASSISTANTS)) {
    const success = await updateAssistant(name, id)
    if (success) successCount++
  }

  console.log('\n' + '='.repeat(60))

  if (successCount === Object.keys(ASSISTANTS).length) {
    console.log(`✅ SUCCESS: All ${successCount} assistants now have date/time context!`)
  } else {
    console.log(`⚠️  Updated ${successCount} of ${Object.keys(ASSISTANTS).length} assistants.`)
  }

  console.log('='.repeat(60))
}

main()
