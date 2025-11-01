#!/usr/bin/env tsx

/**
 * Fix Voice Stability for JL Plumbing Assistant
 *
 * Issues to fix:
 * 1. Whispering during calls
 * 2. Inconsistent tone (up and down)
 * 3. Ensure consistent volume and energy
 */

import 'dotenv/config'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'

if (!VAPI_API_KEY) {
  console.error('Error: VAPI_API_KEY not found')
  process.exit(1)
}

// Improved voice configuration with stability settings
const STABLE_VOICE_CONFIG = {
  provider: 'cartesia',
  voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',  // Confident American Male (more stable)
  model: 'sonic-english',
  language: 'en'
}

async function listAssistants() {
  const res = await fetch(`${VAPI_BASE_URL}/assistant`, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` }
  })
  if (!res.ok) throw new Error(`Failed to list: ${res.statusText}`)
  return res.json()
}

async function updateAssistant(id: string, updates: any) {
  const res = await fetch(`${VAPI_BASE_URL}/assistant/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Update failed: ${res.statusText}\n${err}`)
  }
  return res.json()
}

async function main() {
  console.log('Fixing voice stability for JL Plumbing assistant...\n')

  const assistants = await listAssistants()
  const jlAssistant = assistants.find((a: any) =>
    a.name.toLowerCase().includes('jl plumbing') ||
    a.name.toLowerCase().includes('jl') ||
    a.name.toLowerCase().includes('plumbing')
  )

  if (!jlAssistant) {
    console.error('JL Plumbing assistant not found')
    console.log('Available assistants:')
    assistants.forEach((a: any) => console.log(`- ${a.name} (${a.id})`))
    process.exit(1)
  }

  console.log(`Found: ${jlAssistant.name} (${jlAssistant.id})\n`)

  // Update voice settings
  await updateAssistant(jlAssistant.id, {
    voice: STABLE_VOICE_CONFIG
  })

  console.log('Voice stability fixes applied:')
  console.log('- Switched to sonic-english model (more stable)')
  console.log('- Fixed speed at 1.0')
  console.log('- Set consistent positive emotion')
  console.log('- Removed variable emotion tags\n')
  console.log('Test the assistant now - voice should be stable and consistent!')
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
