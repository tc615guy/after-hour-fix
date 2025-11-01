#!/usr/bin/env tsx

/**
 * Switch JL Plumbing assistant to female voice
 */

import 'dotenv/config'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'

if (!VAPI_API_KEY) {
  console.error('Error: VAPI_API_KEY not found')
  process.exit(1)
}

// Female voice configuration - Friendly American Female
const FEMALE_VOICE_CONFIG = {
  provider: 'cartesia',
  voiceId: '79a125e8-cd45-4c13-8a67-188112f4dd22',  // Friendly Sidekick (female)
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
  console.log('Switching JL Plumbing to female voice...\n')

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

  // Update to female voice
  await updateAssistant(jlAssistant.id, {
    voice: FEMALE_VOICE_CONFIG
  })

  console.log('✅ Voice updated to Friendly Sidekick (Female)')
  console.log('✅ Stable sonic-english model')
  console.log('\nYour assistant now has a nice female voice!')
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
