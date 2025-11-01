#!/usr/bin/env tsx

/**
 * Automated Vapi Assistant Updater
 *
 * This script automatically updates your Vapi assistant with:
 * - Emergency detection keywords
 * - Pricing response logic
 * - Custom functions (emergency check, send pricing)
 * - Cartesia Sonic 3 voice (Ariana)
 * - Context variables
 */

import 'dotenv/config'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

if (!VAPI_API_KEY) {
  console.error('❌ Error: VAPI_API_KEY not found in .env file')
  process.exit(1)
}

if (!APP_URL) {
  console.error('❌ Error: NEXT_PUBLIC_APP_URL not found in .env file')
  process.exit(1)
}

console.log('🚀 AfterHourFix - Vapi Assistant Auto-Updater\n')

// Emergency detection system prompt
const EMERGENCY_PROMPT = `

---

## EMERGENCY DETECTION

Listen carefully for these urgent keywords that require IMMEDIATE response:

**PLUMBING:**
burst pipe | flooding | water everywhere | sewage backup | gas smell | no water

**HVAC:**
no heat (winter) | freezing | carbon monoxide | furnace not working (winter) | burning smell

**ELECTRICAL:**
sparking | smoke | burning smell | electric shock | no power | exposed wires | hot outlet

**TOWING:**
stranded | accident | blocking traffic | highway | dangerous location

**If customer says ANY of these:**
1. Say: "This sounds like an emergency. Let me check if I can get someone to you right away..."
2. Call function: check_emergency_availability
3. IF tech available ? collect required details (name, 10-digit phone, address), then:
   a) Book an immediate slot (start time now) using book_appointment
   b) Call dispatch_emergency with the bookingId to SMS the on-call tech (and transfer live call when appropriate)
4. IF no tech ? "I can get you scheduled for first thing tomorrow at 7 AM" and use book_appointment for tomorrow morning

---

## BOOKING APPOINTMENTS

When customer wants to schedule service, use the book_appointment function.

**Information to collect (in order):**
1. Customer name - "What's your name?"
2. Phone number - "What's your phone number?" (10 digits ONLY, area code + number, NO "1" prefix)
3. Address - "What's the service address?" (full street address with city, state, zip)
4. Service details - "What can we help you with?" or already know from emergency
5. Preferred time - "What day and time works best?" (suggest tomorrow or next available)

**IMPORTANT - Phone Number:**
- Ask: "What's your phone number?"
- Wait for 10 digits (area code + 7 digits)
- DO NOT say "Press 1 then area code"
- DO NOT ask for country code
- Example: They say "555-123-4567" → You capture "5551234567"

**After collecting all info:**
- Call: book_appointment with all parameters
- Confirm: "Perfect! You're all set for [DATE] at [TIME]"

---

## PRICING QUESTIONS

When asked "How much?" or "What do you charge?":

**IF trip fee exists:**
"There's a $[AMOUNT] trip fee to come out, and the final price depends on the parts and labor needed. Our technician will provide a full quote when they arrive."

**IF no trip fee:**
"Pricing depends on parts and labor needed. Our tech will quote you on-site."

**FOR emergencies:**
Always add: "Emergency rates apply, typically 1.5x normal pricing."

---

## VOICE & TONE (Cartesia Sonic 3)

You are speaking with natural expressiveness using Cartesia Sonic 3 voice.

**Use these emotion tags sparingly:**
- [laughter] - Only for light moments, never in emergencies
- Maintain professional, calm, reassuring tone
- Speak clearly, especially during emergencies

**Tone by Situation:**

EMERGENCY: Calm, reassuring, urgent but not panicked
- Example: "I understand this is an emergency. Let me get someone to you right away."
- NO laughter tags

ROUTINE: Friendly, professional, efficient
- Example: "I'd be happy to help you schedule that! Let's find a time that works."

PRICING: Clear, transparent, helpful
- Example: "Great question! There's a trip fee to come out, and I can text you our full pricing sheet if you'd like."

---
`

// Function definitions
const EMERGENCY_FUNCTION = {
  async: false,
  type: 'function' as const,
  function: {
    name: 'check_emergency_availability',
    description: 'Checks if on-call tech available RIGHT NOW for emergencies (burst pipe, sparking, flooding, etc). Returns tech info if available or message to book tomorrow.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project ID for this business'
        }
      },
      required: ['projectId']
    }
  },
  server: {
    url: `${APP_URL}/api/emergency/check-availability`,
    timeoutSeconds: 20
  }
}

const DISPATCH_FUNCTION = {
  async: false,
  type: 'function' as const,
  function: {
    name: 'dispatch_emergency',
    description:
      'Dispatches the highest-priority on-call technician immediately. Creates a pending booking, sends SMS with details, and can transfer the live call.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID for this business' },
        customerName: { type: 'string' },
        customerPhone: { type: 'string', description: '10-digit phone number' },
        address: { type: 'string' },
        notes: { type: 'string' },
        callId: { type: 'string', description: 'Current Vapi call id, if active' },
        bookingId: { type: 'string', description: 'Existing booking id (if already booked)' },
        slotStart: { type: 'string', description: 'ISO date/time for the booked appointment (optional)' },
      },
      required: ['projectId', 'customerName', 'customerPhone', 'address']
    },
  },
  server: {
    url: `${APP_URL}/api/emergency/dispatch`,
    timeoutSeconds: 20,
  },
}

const BOOKING_FUNCTION = {
  async: false,
  type: 'function' as const,
  function: {
    name: 'book_appointment',
    description: 'Books a service appointment with Cal.com. Collect customer name, 10-digit phone (area code + number, NO country code), full street address, service notes, and preferred start time.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project ID for this business'
        },
        customerName: {
          type: 'string',
          description: 'Customer full name'
        },
        customerPhone: {
          type: 'string',
          description: '10-digit phone number with area code (e.g., 5551234567). DO NOT ask for country code or "1" prefix. Just area code and phone number.'
        },
        address: {
          type: 'string',
          description: 'Full street address including city, state, zip'
        },
        notes: {
          type: 'string',
          description: 'Service request details and any special notes'
        },
        startTime: {
          type: 'string',
          description: 'Preferred appointment start time in ISO format'
        }
      },
      required: ['customerName', 'customerPhone', 'address', 'notes', 'startTime']
    }
  },
  server: {
    url: `${APP_URL}/api/book`,
    timeoutSeconds: 30
  }
}

// Cartesia Sonic 3 voice configuration
const CARTESIA_VOICE = {
  provider: 'cartesia',
  voiceId: 'ec1e269e-9ca0-402f-8a18-58e0e022355a', // Ariana
  model: 'sonic-3',
  language: 'en'
}

interface Assistant {
  id: string
  name: string
  model?: any
  voice?: any
  createdAt: string
  updatedAt: string
}

async function listAssistants(): Promise<Assistant[]> {
  console.log('📋 Fetching your Vapi assistants...\n')

  const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to list assistants: ${response.statusText}`)
  }

  return response.json()
}

async function getAssistant(assistantId: string): Promise<any> {
  const response = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to get assistant: ${response.statusText}`)
  }

  return response.json()
}

async function updateAssistant(assistantId: string, updates: any): Promise<any> {
  const response = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update assistant: ${response.statusText}\n${error}`)
  }

  return response.json()
}

async function main() {
  try {
    // Step 1: List all assistants
    const assistants = await listAssistants()

    if (assistants.length === 0) {
      console.log('❌ No assistants found in your Vapi account')
      process.exit(1)
    }

    console.log(`Found ${assistants.length} assistant(s):\n`)
    assistants.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.name} (ID: ${a.id})`)
      console.log(`     Created: ${new Date(a.createdAt).toLocaleString()}`)
      console.log(`     Updated: ${new Date(a.updatedAt).toLocaleString()}\n`)
    })

    // Step 2: Let user choose which assistant to update
    let selectedAssistant: Assistant

    if (assistants.length === 1) {
      selectedAssistant = assistants[0]
      console.log(`✅ Auto-selecting the only assistant: ${selectedAssistant.name}\n`)
    } else {
      // Use the most recently updated assistant
      selectedAssistant = assistants.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0]
      console.log(`✅ Auto-selecting most recently updated: ${selectedAssistant.name}\n`)
      console.log(`   💡 To update a different assistant, edit this script and specify the ID\n`)
    }

    // Step 3: Get full assistant details
    console.log('📥 Fetching full assistant configuration...\n')
    const fullAssistant = await getAssistant(selectedAssistant.id)

    // Step 4: Prepare updates
    console.log('🔧 Preparing updates...\n')

    // Get existing system prompt
    let existingPrompt = ''
    if (fullAssistant.model?.messages && fullAssistant.model.messages.length > 0) {
      const systemMessage = fullAssistant.model.messages.find((m: any) => m.role === 'system')
      if (systemMessage) {
        existingPrompt = systemMessage.content
      }
    }

    // Check if already updated
    if (existingPrompt.includes('EMERGENCY DETECTION')) {
      console.log('⚠️  Emergency detection already present in system prompt')
      console.log('   Checking if booking instructions are present...\n')

      // Check if booking instructions are missing
      if (!existingPrompt.includes('BOOKING APPOINTMENTS')) {
        console.log('⚠️  Booking instructions missing! Adding them now...\n')
        existingPrompt += EMERGENCY_PROMPT  // This includes booking instructions
        console.log('✅ Added booking instructions to system prompt')
      } else {
        console.log('   Booking instructions already present\n')
      }
    } else {
      existingPrompt += EMERGENCY_PROMPT
      console.log('✅ Added emergency detection and booking instructions to system prompt')
    }

    // Prepare update payload
    const updates: any = {
      model: {
        ...fullAssistant.model,
        messages: [
          {
            role: 'system',
            content: existingPrompt
          }
        ],
        tools: [
          EMERGENCY_FUNCTION,
          DISPATCH_FUNCTION,
          BOOKING_FUNCTION,
          ...(fullAssistant.model?.tools || []).filter((t: any) =>
            t.function?.name !== 'check_emergency_availability' &&
            t.function?.name !== 'dispatch_emergency' &&
            t.function?.name !== 'send_pricing_sheet' &&
            t.function?.name !== 'book_appointment'
          )
        ]
      },
      voice: CARTESIA_VOICE
    }

    console.log('✅ Added check_emergency_availability function')
    console.log('✅ Added book_appointment function')
    console.log('✅ Configured Cartesia Sonic 3 voice (Ariana)\n')

    // Step 5: Update assistant
    console.log('🚀 Updating assistant in Vapi...\n')
    const updated = await updateAssistant(selectedAssistant.id, updates)

    console.log('✅ SUCCESS! Assistant updated successfully!\n')
    console.log('📊 Summary of changes:\n')
    console.log('  ✓ Emergency detection keywords added')
    console.log('  ✓ Pricing response logic added')
    console.log('  ✓ check_emergency_availability function configured')
    console.log('  ✓ book_appointment function configured (10-digit phone, no "1" prefix)')
    console.log('  ✓ Voice upgraded to Cartesia Sonic 3 (Ariana)')
    console.log('\n🎉 Your assistant is now ready!\n')
    console.log('Next steps:')
    console.log('  1. Configure your settings at: http://localhost:3001/projects/[YOUR_ID]/settings')
    console.log('  2. Add on-call technicians in "Emergency On-Call" tab')
    console.log('  3. Set up pricing in "Pricing & Costs" tab')
    console.log('  4. Test by calling your Vapi number!\n')

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()

