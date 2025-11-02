#!/usr/bin/env tsx

import 'dotenv/config'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'

if (!VAPI_API_KEY) {
  console.error('❌ VAPI_API_KEY not found')
  process.exit(1)
}

// Demo assistant IDs
const DEMO_ASSISTANTS = {
  'Demo Plumbing': '66ac9a80-cee3-4084-95fa-c51ede8ccf5c',
  'Demo HVAC': 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f',
  'Demo Electrical': 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5',
}

// Get current date/time in Central Time
function getCurrentDateTime() {
  const now = new Date()

  // Format for display (Central Time)
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
    timeZoneName: 'short'
  }

  const formatted = now.toLocaleString('en-US', options)
  const iso = now.toISOString()

  return { formatted, iso }
}

async function updateAssistant(name: string, assistantId: string) {
  try {
    console.log(`\n📝 Updating ${name}...`)

    // Get current assistant
    const getRes = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
      },
    })

    if (!getRes.ok) {
      throw new Error(`Failed to fetch assistant: ${getRes.statusText}`)
    }

    const assistant = await getRes.json()
    const currentPrompt = assistant.model?.messages?.[0]?.content || ''

    // Get current date/time
    const { formatted, iso } = getCurrentDateTime()

    // Update the date/time section
    const dateSection = `**IMPORTANT - CURRENT DATE/TIME:**
Today is: ${formatted}
ISO Format: ${iso}
When booking appointments, ALWAYS use dates/times that are NOW or in the FUTURE. Never use past dates.`

    // Replace the date section in the prompt
    const updatedPrompt = currentPrompt.replace(
      /\*\*IMPORTANT - CURRENT DATE\/TIME:\*\*[\s\S]*?When booking appointments.*?Never use past dates\./,
      dateSection
    )

    // Update the assistant
    const updateRes = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: {
          ...assistant.model,
          messages: [
            {
              role: 'system',
              content: updatedPrompt,
            },
          ],
        },
      }),
    })

    if (!updateRes.ok) {
      throw new Error(`Failed to update assistant: ${updateRes.statusText}`)
    }

    console.log(`   ✅ Updated with: ${formatted}`)
    console.log(`   📅 ISO: ${iso}`)

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
  }
}

async function main() {
  console.log('🔄 Updating demo assistant dates/times...\n')
  console.log('Current Date/Time:', getCurrentDateTime().formatted)
  console.log('ISO Format:', getCurrentDateTime().iso)

  for (const [name, id] of Object.entries(DEMO_ASSISTANTS)) {
    await updateAssistant(name, id)
  }

  console.log('\n✨ All demo assistants updated!')
}

main()
