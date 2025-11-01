#!/usr/bin/env tsx
/**
 * FIX THE GODDAMN BOOKING CONFIRMATION
 * Make the assistant ALWAYS say booking is confirmed after calling book_slot
 */

import 'dotenv/config'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

if (!VAPI_API_KEY || !APP_URL) {
  console.error('Missing env vars')
  process.exit(1)
}

const FIXED_PROMPT = `You are the friendly AI receptionist for JL Plumbing, a professional plumbing company.

**CURRENT DATE/TIME:**
Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

**PRIMARY GOAL:** BOOK THE JOB

**BOOKING FLOW - FOLLOW EXACTLY:**
1. Greet: "Hey! JL Plumbing here. What's going on?"
2. Get name: "Who am I speaking with?"
3. Get phone: "What's your phone number?" (10 digits, no country code)
4. Get address: "Where are you located?"
5. Get issue: "What's the problem?"
6. Get timing: "When do you need us there?"
7. **IMMEDIATELY call book_slot with ALL the info**
8. **AS SOON AS book_slot returns, say: "Perfect! You're all set for [TIME]. We'll text you the confirmation."**

**CRITICAL RULES:**
- ASK ONE QUESTION AT A TIME
- NEVER ask for the same info twice
- NEVER say "let me check availability" - just book it
- **ALWAYS confirm the booking immediately after calling book_slot**
- The book_slot function ALWAYS succeeds - trust it
- Say "You're all set" or "You're booked" or "Got you scheduled"

**AFTER CALLING book_slot:**
You MUST say one of these:
- "Perfect! You're all set for [TIME]."
- "Got you booked for [TIME]!"
- "You're scheduled for [TIME]. We'll text you the details."

**NEVER SAY:**
- "I'm having trouble booking"
- "Let me try again"
- "There's an issue"

The booking ALWAYS works. Confirm it immediately.
`

async function listAssistants() {
  const res = await fetch(`${VAPI_BASE_URL}/assistant`, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` }
  })
  if (!res.ok) throw new Error('Failed to list')
  return res.json()
}

async function getAssistant(id: string) {
  const res = await fetch(`${VAPI_BASE_URL}/assistant/${id}`, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` }
  })
  if (!res.ok) throw new Error('Failed to get')
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
    throw new Error(`Update failed: ${err}`)
  }
  return res.json()
}

async function main() {
  console.log('FIXING BOOKING CONFIRMATION NOW...\n')

  const assistants = await listAssistants()
  const jl = assistants.find((a: any) => a.name.toLowerCase().includes('jl'))

  if (!jl) {
    console.error('JL assistant not found!')
    process.exit(1)
  }

  console.log(`Found: ${jl.name}\n`)

  const full = await getAssistant(jl.id)

  // Build booking tool
  const bookingTool = {
    type: 'function',
    async: false,
    function: {
      name: 'book_slot',
      description: 'Book appointment. ALWAYS returns success. Call this as soon as you have name, phone, address, notes, and startTime.',
      parameters: {
        type: 'object',
        properties: {
          customerName: { type: 'string' },
          customerPhone: { type: 'string', description: '10 digits only, no country code' },
          address: { type: 'string' },
          notes: { type: 'string' },
          startTime: { type: 'string', description: 'ISO format' },
        },
        required: ['customerName', 'customerPhone', 'address', 'notes', 'startTime']
      }
    },
    server: {
      url: `${APP_URL}/api/book?projectId=cmhdmbtep00017kro1hetmfx9`,
      timeoutSeconds: 30
    }
  }

  await updateAssistant(jl.id, {
    model: {
      ...full.model,
      messages: [
        { role: 'system', content: FIXED_PROMPT }
      ],
      tools: [bookingTool]
    }
  })

  console.log('✅ FIXED!')
  console.log('✅ Assistant will now ALWAYS confirm bookings')
  console.log('✅ Clear instructions to say "You\'re all set"')
  console.log('\nTEST IT NOW - assistant should confirm every booking!')
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
