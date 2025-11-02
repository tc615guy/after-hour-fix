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

// Kentucky Man - Southern accent, warm, friendly
const KENTUCKY_MAN_VOICE = {
  provider: 'cartesia',
  voiceId: '700d1ee3-a641-4018-ba6e-899dcadc9e2b',
  model: 'sonic-english',
  language: 'en'
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
        voice: KENTUCKY_MAN_VOICE,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    console.log(`   ✅ Updated to Kentucky Man voice`)

    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🎙️  Switching All Assistants to Kentucky Man Voice\n')
  console.log('Voice: Southern accent, warm, friendly')
  console.log('ID: 700d1ee3-a641-4018-ba6e-899dcadc9e2b\n')

  let successCount = 0

  for (const [name, id] of Object.entries(ASSISTANTS)) {
    const success = await updateAssistant(name, id)
    if (success) successCount++
  }

  console.log('\n' + '='.repeat(60))

  if (successCount === Object.keys(ASSISTANTS).length) {
    console.log(`✅ SUCCESS: All ${successCount} assistants updated to Kentucky Man!`)
    console.log('🎙️  Southern accent, warm, and friendly voice active.')
  } else {
    console.log(`⚠️  Updated ${successCount} of ${Object.keys(ASSISTANTS).length} assistants.`)
  }

  console.log('='.repeat(60))
}

main()
