#!/usr/bin/env tsx

import 'dotenv/config'

/**
 * Updates demo assistants to match the exact configuration used for new assistants
 */

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'

const DEMO_ASSISTANTS = {
  'Demo Electrical': 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5',
  'Demo HVAC': 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f',
  'Demo Plumbing': '6d0cbda1-0b1d-4d24-bcc9-dfab156b5fbb',
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
          model: 'gpt-4o-mini',
          temperature: 0.7,
        },
        recordingEnabled: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const updated = await response.json()

    console.log(`   ✅ Updated successfully`)
    console.log(`   Temperature: ${updated.model?.temperature}`)
    console.log(`   Recording: ${updated.recordingEnabled}`)

    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🔧 Updating Demo Assistants to Match New Assistant Configuration\n')
  console.log('Changes to apply:')
  console.log('  • model.temperature: 0.7')
  console.log('  • recordingEnabled: true')
  console.log('')

  let successCount = 0

  for (const [name, id] of Object.entries(DEMO_ASSISTANTS)) {
    const success = await updateAssistant(name, id)
    if (success) successCount++
  }

  console.log('\n' + '='.repeat(60))

  if (successCount === Object.keys(DEMO_ASSISTANTS).length) {
    console.log(`✅ SUCCESS: All ${successCount} demo assistants updated!`)
    console.log('✅ Demo assistants now match new assistant configuration.')
  } else {
    console.log(`⚠️  Updated ${successCount} of ${Object.keys(DEMO_ASSISTANTS).length} assistants.`)
  }

  console.log('='.repeat(60))
}

main()
