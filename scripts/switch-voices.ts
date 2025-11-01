#!/usr/bin/env tsx

import 'dotenv/config'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'

const ASSISTANTS = {
  'JL Plumbing': 'bb2dd9f1-50b6-49e9-a848-7d03031ea845',
  'Demo Electrical': 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5',
  'Demo HVAC': 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f',
  'Demo Plumbing': '6d0cbda1-0b1d-4d24-bcc9-dfab156b5fbb',
}

// Valid voices for sonic-english model
const VOICES = {
  'helpful-man': {
    id: 'a0e99841-438c-4a64-b679-ae501e7d6091',
    name: 'Helpful Man',
    description: 'Energetic, helpful (CURRENT)'
  },
  'salesman': {
    id: '41534e16-2966-4c6b-9670-111411def906',
    name: 'Salesman',
    description: 'Smooth, persuasive'
  },
  'newsman': {
    id: '69267136-1bdc-412f-ad78-0caad210fb40',
    name: 'Newsman',
    description: 'Clear, authoritative broadcaster'
  },
  'british': {
    id: '87748186-23bb-4158-a1eb-332911b0b708',
    name: 'Classy British Man',
    description: 'British accent, sophisticated'
  },
  'wise-man': {
    id: '638efaaa-4d0c-442e-b701-3fae16aad012',
    name: 'Wise Man',
    description: 'Deep, calm, reassuring'
  },
  'young-man': {
    id: 'bd9120b6-7761-47a6-a446-77ca49132781',
    name: 'Young Man',
    description: 'Casual, energetic, friendly'
  }
}

async function updateAssistant(name: string, id: string, voiceId: string) {
  try {
    const response = await fetch(`${VAPI_BASE_URL}/assistant/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice: {
          provider: 'cartesia',
          voiceId: voiceId,
          model: 'sonic-english',
          language: 'en'
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    console.log(`   ✅ ${name}`)
    return true
  } catch (error: any) {
    console.error(`   ❌ ${name}: ${error.message}`)
    return false
  }
}

async function main() {
  const voiceKey = process.argv[2]

  if (!voiceKey || !VOICES[voiceKey as keyof typeof VOICES]) {
    console.log('🎙️  Available Voices for sonic-english model:\n')
    Object.entries(VOICES).forEach(([key, voice]) => {
      console.log(`  ${key.padEnd(15)} - ${voice.name}`)
      console.log(`  ${' '.repeat(17)} ${voice.description}`)
      console.log('')
    })
    console.log('Usage: npx tsx scripts/switch-voices.ts <voice-key>')
    console.log('Example: npx tsx scripts/switch-voices.ts salesman')
    return
  }

  const voice = VOICES[voiceKey as keyof typeof VOICES]

  console.log(`\n🎙️  Switching to: ${voice.name}`)
  console.log(`Description: ${voice.description}`)
  console.log(`ID: ${voice.id}\n`)

  let successCount = 0

  for (const [name, id] of Object.entries(ASSISTANTS)) {
    const success = await updateAssistant(name, id, voice.id)
    if (success) successCount++
  }

  console.log(`\n✅ Updated ${successCount}/${Object.keys(ASSISTANTS).length} assistants`)
}

main()
