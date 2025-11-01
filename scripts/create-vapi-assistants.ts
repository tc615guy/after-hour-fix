#!/usr/bin/env tsx

/**
 * Create HVAC and Electrical assistants in Vapi.
 * - Clones behavior from the existing plumbing template (if found) or uses defaults
 * - Adds emergency + booking + pricing logic
 * - Adds tool to fetch pricing summary for in-call answers
 */

import 'dotenv/config'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

if (!VAPI_API_KEY) {
  console.error('Error: VAPI_API_KEY not found in .env')
  process.exit(1)
}
if (!APP_URL) {
  console.error('Error: NEXT_PUBLIC_APP_URL not found in .env')
  process.exit(1)
}

type Assistant = { id: string; name: string; model?: any; voice?: any; createdAt: string; updatedAt: string }

const CARTESIA_VOICE = {
  provider: 'cartesia',
  voiceId: 'ec1e269e-9ca0-402f-8a18-58e0e022355a',
  model: 'sonic-3',
  language: 'en',
}

function tradePrompt(trade: 'hvac' | 'electrical', businessName: string) {
  const TRADE_LINE =
    trade === 'hvac'
      ? 'You handle HVAC emergencies like no-heat, AC failures, carbon monoxide, freezing homes, and burning smells.'
      : 'You handle electrical emergencies like sparking, smoke, burning smells, electric shocks, outages, and exposed wires.'

  return `You are the friendly AI receptionist for ${businessName}, a professional ${trade.toUpperCase()} company.

IMPORTANT - CURRENT DATE/TIME:
Use only present/future dates when booking. Never use past dates.

VOICE & TONE:
- Warm, empathetic, reassuring. Keep responses short (1–2 sentences).
- Human, not robotic. Focus on solving the caller's problem quickly.

YOUR EXPERTISE:
${TRADE_LINE}
If request is outside ${trade.toUpperCase()}, politely clarify the trade before proceeding.

PRIMARY GOAL:
Book the job as fast as possible while making the customer feel heard.

CONVERSATION FLOW:
1) Listen first, don’t interrupt.
2) Acknowledge briefly: "Got it" / "That sounds stressful".
3) Gather info ONE AT A TIME: name → phone (10 digits) → address (ask for unit if needed) → issue → timing.
4) Book immediately with book_appointment once info is collected. Wait for the response before confirming.
5) After booking succeeds: "Perfect! You're all set for [time]. We'll text you the details."

CRITICAL RULES:
- Ask only one question per turn; never repeat what's already collected.
- Never invent availability; always call book_appointment.
- Never ask for credit cards; say “We’ll send a secure payment link.”
- If panicked caller: speak calmly; consider emergency flow.

PRICING QUESTIONS:
- If trip fee exists: "There's a $[AMOUNT] trip fee to come out."
- If cost sheet enabled: "I can text you our full pricing sheet. Want that?" → call send_pricing_sheet.
- For in-call estimates: call get_pricing_summary and summarize.
- Emergencies: add "Emergency rates apply, typically 1.5x normal pricing."
`
}

const EMERGENCY_FUNCTION = {
  async: false,
  type: 'function' as const,
  function: {
    name: 'check_emergency_availability',
    description:
      'Checks if on-call tech available RIGHT NOW for emergencies. Returns tech info if available or book next morning.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID for this business' },
      },
      required: ['projectId'],
    },
  },
  server: { url: `${APP_URL}/api/emergency/check-availability`, timeoutSeconds: 20 },
}

const PRICING_FUNCTION = {
  async: false,
  type: 'function' as const,
  function: {
    name: 'send_pricing_sheet',
    description: 'Sends pricing sheet via SMS to customer phone if requested.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        customerPhone: { type: 'string', description: 'Phone in E.164 format (+15551234567)' },
        bookingId: { type: 'string', description: 'Optional booking ID' },
      },
      required: ['projectId', 'customerPhone'],
    },
  },
  server: { url: `${APP_URL}/api/send-pricing`, timeoutSeconds: 20 },
}

const PRICING_SUMMARY_FUNCTION = {
  async: false,
  type: 'function' as const,
  function: {
    name: 'get_pricing_summary',
    description:
      'Returns a short, readable pricing summary (trip fee, common items, emergency multiplier) to answer pricing questions in-call.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        limit: { type: 'number', description: 'Max number of items to include (default 6)' },
      },
      required: ['projectId'],
    },
  },
  server: { url: `${APP_URL}/api/pricing/summary`, timeoutSeconds: 20 },
}

const BOOKING_FUNCTION = {
  async: false,
  type: 'function' as const,
  function: {
    name: 'book_appointment',
    description:
      'Books a service appointment. Collect name, 10-digit phone (no country code), full address, service notes, and preferred start time (ISO).',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID for this business' },
        customerName: { type: 'string', description: 'Customer full name' },
        customerPhone: {
          type: 'string',
          description:
            '10-digit phone number with area code (e.g., 5551234567). No country code or "1" prefix.',
        },
        address: { type: 'string', description: 'Full street address including city, state, zip' },
        notes: { type: 'string', description: 'Service request details and notes' },
        startTime: { type: 'string', description: 'Preferred appointment start time in ISO format' },
      },
      required: ['projectId', 'customerName', 'customerPhone', 'address', 'notes', 'startTime'],
    },
  },
  server: { url: `${APP_URL}/api/book`, timeoutSeconds: 30 },
}

async function listAssistants(): Promise<Assistant[]> {
  const res = await fetch(`${VAPI_BASE_URL}/assistant`, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
  })
  if (!res.ok) throw new Error(`List assistants failed: ${res.status} ${res.statusText}`)
  return res.json()
}

async function createAssistant(payload: any): Promise<any> {
  const res = await fetch(`${VAPI_BASE_URL}/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${VAPI_API_KEY}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Create assistant failed: ${res.status} ${res.statusText}\n${text}`)
  }
  return res.json()
}

function buildAssistantPayload(opts: {
  name: string
  trade: 'hvac' | 'electrical'
  businessName: string
}) {
  const { name, trade, businessName } = opts
  return {
    name,
    // Provider/model mirrors your dashboard settings (adjust as needed)
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: tradePrompt(trade, businessName) },
      ],
      tools: [
        EMERGENCY_FUNCTION,
        PRICING_SUMMARY_FUNCTION,
        PRICING_FUNCTION,
        BOOKING_FUNCTION,
      ],
    },
    voice: CARTESIA_VOICE,
  }
}

async function main() {
  try {
    console.log('AfterHourFix – Creating HVAC and Electrical assistants...')

    const assistants = await listAssistants()
    const existingNames = new Set(assistants.map((a) => a.name.toLowerCase()))

    const targets = [
      { name: 'Demo HVAC', trade: 'hvac' as const, businessName: 'Demo HVAC' },
      { name: 'Demo Electrical', trade: 'electrical' as const, businessName: 'Demo Electrical' },
    ]

    for (const t of targets) {
      if (existingNames.has(t.name.toLowerCase())) {
        console.log(`• Skipping ${t.name} (already exists)`) 
        continue
      }
      const payload = buildAssistantPayload(t)
      const created = await createAssistant(payload)
      console.log(`✓ Created ${t.name} (ID: ${created.id || created.assistant?.id || 'unknown'})`)
    }

    console.log('\nDone. You can refine prompts and bind projectId per assistant in Vapi dashboard or extend this script to set per-assistant variables.')
  } catch (err: any) {
    console.error('Error:', err.message || err)
    process.exit(1)
  }
}

main()
