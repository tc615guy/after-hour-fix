#!/usr/bin/env tsx

/**
 * Replace hardcoded dates with VAPI's dynamic date/time variables
 * Uses LiquidJS templating that VAPI natively supports
 */

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

// Dynamic date/time section using VAPI's LiquidJS templating
const DYNAMIC_DATE_SECTION = `**IMPORTANT - CURRENT DATE/TIME:**
Today is: {{"now" | date: "%A, %B %d, %Y at %I:%M %p", "America/Chicago"}} CST
ISO Format: {{"now" | date: "%Y-%m-%dT%H:%M:%S.000Z", "UTC"}}
When booking appointments, ALWAYS use dates/times that are NOW or in the FUTURE. Never use past dates.`

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

    // Replace the hardcoded date section with dynamic template
    const updatedPrompt = currentPrompt.replace(
      /\*\*IMPORTANT - CURRENT DATE\/TIME:\*\*[\s\S]*?When booking appointments.*?Never use past dates\./,
      DYNAMIC_DATE_SECTION
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

    console.log(`   ✅ Updated with dynamic date/time template`)
    console.log(`   🔄 Now uses: {{"now" | date: "...", "America/Chicago"}}`)

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
  }
}

async function main() {
  console.log('🔄 Updating demo assistants with dynamic date/time...\n')
  console.log('📅 Replacing hardcoded dates with VAPI LiquidJS templates')
  console.log('✨ Date/time will now auto-update for EVERY call!\n')

  for (const [name, id] of Object.entries(DEMO_ASSISTANTS)) {
    await updateAssistant(name, id)
  }

  console.log('\n✅ All demo assistants now use dynamic dates!')
  console.log('\nTemplate format:')
  console.log('  {{"now" | date: "%A, %B %d, %Y at %I:%M %p", "America/Chicago"}}')
  console.log('\nThis will automatically show the current date/time for every call.')
  console.log('No more manual updates needed! 🎉')
}

main()
