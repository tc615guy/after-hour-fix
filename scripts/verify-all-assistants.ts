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

async function checkAssistant(name: string, id: string) {
  console.log(`\n📋 ${name}:`)

  try {
    const response = await fetch(`${VAPI_BASE_URL}/assistant/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const assistant = await response.json()

    console.log(`   Voice: ${assistant.voice?.provider} - ${assistant.voice?.voiceId}`)
    console.log(`   Model: ${assistant.model?.model}`)
    console.log(`   First message: ${assistant.firstMessage}`)

    const systemPrompt = assistant.model?.messages?.[0]?.content || ''
    const hasDateContext = systemPrompt.includes('CURRENT DATE/TIME') || systemPrompt.includes('date and time')
    const hasAddressConfirm = systemPrompt.includes('CONFIRM IT BACK') || systemPrompt.includes('confirm')
    const hasPhoneConfirm = systemPrompt.includes('repeat number') || systemPrompt.includes('phone')

    console.log(`   ✓ Date/Time context: ${hasDateContext ? 'YES' : 'NO'}`)
    console.log(`   ✓ Address confirmation: ${hasAddressConfirm ? 'YES' : 'NO'}`)
    console.log(`   ✓ Phone confirmation: ${hasPhoneConfirm ? 'YES' : 'NO'}`)

    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🔍 Verifying All Assistant Configurations\n')
  console.log('=' .repeat(60))

  for (const [name, id] of Object.entries(ASSISTANTS)) {
    await checkAssistant(name, id)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Verification complete!')
}

main()
