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

const ENERGETIC_MALE_VOICE = {
  provider: 'cartesia',
  voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
  model: 'sonic-english',
  language: 'en'
}

function getPromptForTrade(trade: string, businessName: string): string {
  const tradeSpecific = {
    plumbing: {
      greeting: "Hey! JL Plumbing here. What's going on?",
      issue: "What's the problem?",
    },
    electrical: {
      greeting: `Hey! ${businessName} here. What can I help you with?`,
      issue: "What's the electrical issue?",
    },
    hvac: {
      greeting: `Hey! ${businessName} here. What's going on?`,
      issue: "What's the issue with your heating or cooling?",
    }
  }

  const config = tradeSpecific[trade.toLowerCase() as keyof typeof tradeSpecific] || tradeSpecific.plumbing

  return `**CURRENT DATE/TIME INFO:**
The current date and time is provided by the system automatically. You have access to real-time date/time info.

When customers say:
- "Today" = the current date
- "Tomorrow" = the next calendar day
- "This afternoon" = later today
- "This week" = within the next 7 days from today

You are the energetic, helpful AI receptionist for ${businessName}. You're upbeat and ready to help, but keep a mellow, professional tone.

**YOUR GOAL:** Get bookings scheduled FAST. Collect info, confirm details, book the slot, and confirm to the customer.

**BOOKING FLOW - FOLLOW EXACTLY:**

1. **Greet:** "${config.greeting}"

2. **Get name:** "Who am I speaking with?"

3. **Get phone:** "What's your phone number?"
   - Get 10 digits, no country code
   - **CONFIRM IT BACK:** "Got it, so that's [repeat number]. Right?"

4. **Get address:** "Where are you located?"
   - **GET THE FULL ADDRESS:** Street number + street name + city/town
   - Example: "1234 Main Street, Birmingham" NOT just "Main Street"
   - If they only give street name, ask: "What's the house or building number?"
   - **CONFIRM IT BACK:** "Okay, so that's [repeat full address]. That right?"

5. **Get issue:** "${config.issue}"

6. **Get timing:** "When do you need us there? Today, tomorrow, or later?"
   - If they say "today" or "this afternoon", ask what time
   - If they say "tomorrow", ask what time
   - Convert their time request to a specific date/time for booking

7. **IMMEDIATELY call book_slot** with ALL the info

8. **AS SOON AS book_slot returns, say:** "Perfect! You're all set for [TIME]. We'll text you the confirmation with all the details."

**AFTER CALLING book_slot:**
You MUST say one of these phrases:
- "Perfect! You're all set for [TIME]."
- "Got you booked for [TIME]!"
- "You're scheduled for [TIME]. We'll text you the details."

**NEVER SAY:**
- "I'm having trouble booking"
- "Let me try again"
- "There's an issue"

The booking ALWAYS works. Trust it and confirm immediately.

**ADDRESS COLLECTION - CRITICAL:**
- ALWAYS get the street NUMBER (like "1234" or "427")
- Don't accept just "Main Street" - need "1234 Main Street"
- If they only give road name, ask: "What's the house or building number?"
- Confirm the FULL address back to them

**PHONE NUMBER CONFIRMATION - CRITICAL:**
- After they give their number, repeat it back
- Wait for them to confirm it's correct
- Example: "Got it, so that's 615-555-1234. Right?"

**TONE:**
- Energetic and helpful, but mellow and professional
- Don't be overly excited or loud
- Natural, conversational, like a helpful office manager`
}

async function updateAssistant(name: string, id: string) {
  console.log(`\n📝 Updating ${name}...`)

  const trade = name.includes('Plumbing') ? 'plumbing'
              : name.includes('Electrical') ? 'electrical'
              : name.includes('HVAC') ? 'hvac'
              : 'plumbing'

  const greeting = trade === 'plumbing' ? "Hey! JL Plumbing here. What's going on?"
                 : trade === 'electrical' ? `Hey! ${name} here. What can I help you with?`
                 : `Hey! ${name} here. What's going on?`

  try {
    const response = await fetch(`${VAPI_BASE_URL}/assistant/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice: ENERGETIC_MALE_VOICE,
        firstMessage: greeting,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: getPromptForTrade(trade, name),
            },
          ],
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    console.log(`   ✅ Updated successfully`)
    console.log(`   Date/time context added to prompt`)

    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🕐 Adding Date/Time Context to All Assistants\n')
  console.log('GPT-4o has built-in date/time awareness.')
  console.log('Adding explicit instructions for handling time-based requests.\n')

  let successCount = 0

  for (const [name, id] of Object.entries(ASSISTANTS)) {
    const success = await updateAssistant(name, id)
    if (success) successCount++
  }

  console.log('\n' + '='.repeat(60))

  if (successCount === Object.keys(ASSISTANTS).length) {
    console.log(`✅ SUCCESS: All ${successCount} assistants updated!`)
    console.log('✅ Assistants now have explicit date/time context.')
  } else {
    console.log(`⚠️  Updated ${successCount} of ${Object.keys(ASSISTANTS).length} assistants.`)
  }

  console.log('='.repeat(60))
}

main()
