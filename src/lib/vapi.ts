import axios, { AxiosInstance } from 'axios'

const ENABLE_MOCK_MODE = process.env.ENABLE_MOCK_MODE === 'true'

const VAPI_API_KEY = process.env.VAPI_API_KEY || ''
const VAPI_BASE_URL = 'https://api.vapi.ai'

export interface VapiAssistantTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
  server?: {
    url: string
    secret?: string
  }
}

export interface VapiAssistantInput {
  name: string
  model?: {
    provider: string
    model: string
    temperature?: number
    messages?: Array<{
      role: string
      content: string
    }>
    tools?: VapiAssistantTool[]
  }
  voice?: {
    provider: string
    voiceId: string
    model?: string
    language?: string
  }
  transcriber?: {
    provider: string
    model: string
    language?: string
  }
  firstMessage?: string
  recordingEnabled?: boolean
}

export interface VapiAssistant {
  id: string
  name: string
  systemPrompt: string
  voice?: any
  model?: any
  firstMessage?: string
  recordingEnabled?: boolean
}

export interface VapiPhoneNumber {
  id: string
  number: string
  provider: string
  assistantId?: string
}

export class VapiClient {
  private client: AxiosInstance

  constructor(apiKey: string = VAPI_API_KEY) {
    this.client = axios.create({
      baseURL: VAPI_BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
  }

  async createAssistant(input: VapiAssistantInput): Promise<VapiAssistant> {
    try {
      const response = await this.client.post('/assistant', input)
      return response.data
    } catch (error: any) {
      const details = error.response?.data || error.message
      console.error('Vapi createAssistant error:', details)
      if (ENABLE_MOCK_MODE) {
        return {
          id: `mock-assistant-${Date.now()}`,
          name: input.name,
          systemPrompt: (input as any).systemPrompt,
          voice: input.voice,
          model: input.model,
        }
      }
      throw new Error(
        typeof details === 'string' ? details : JSON.stringify(details)
      )
    }
  }

  async getAssistant(assistantId: string): Promise<VapiAssistant> {
    try {
      const response = await this.client.get(`/assistant/${assistantId}`)
      return response.data
    } catch (error: any) {
      console.error('Vapi getAssistant error:', error.response?.data || error.message)
      throw new Error('Failed to get Vapi assistant')
    }
  }

  async updateAssistant(assistantId: string, input: Partial<VapiAssistantInput>): Promise<VapiAssistant> {
    try {
      const response = await this.client.patch(`/assistant/${assistantId}`, input)
      return response.data
    } catch (error: any) {
      console.error('Vapi updateAssistant error:', error.response?.data || error.message)
      throw new Error('Failed to update Vapi assistant')
    }
  }

  async searchPhoneNumbers(areaCode?: string): Promise<VapiPhoneNumber[]> {
    try {
      // Vapi doesn't have a search endpoint anymore, return empty array
      // Users should purchase specific numbers instead
      console.warn('searchPhoneNumbers: Vapi no longer supports searching available numbers')
      if (ENABLE_MOCK_MODE) {
        return [
          { id: 'mock-1', number: '+15551234567', provider: 'twilio' },
          { id: 'mock-2', number: '+15551234568', provider: 'twilio' },
          { id: 'mock-3', number: '+15551234569', provider: 'twilio' },
        ]
      }
      // In production, return empty to force user to provide a specific number
      return []
    } catch (error: any) {
      const details = error.response?.data || error.message
      console.error('Vapi searchPhoneNumbers error:', details)
      if (ENABLE_MOCK_MODE) {
        return [
          { id: 'mock-1', number: '+15551234567', provider: 'twilio' },
          { id: 'mock-2', number: '+15551234568', provider: 'twilio' },
          { id: 'mock-3', number: '+15551234569', provider: 'twilio' },
        ]
      }
      throw new Error(typeof details === 'string' ? details : JSON.stringify(details))
    }
  }

  async purchasePhoneNumber(
    number: string, 
    assistantId: string, 
    options?: { serverUrl?: string; serverUrlSecret?: string; fallbackDestination?: string }
  ): Promise<VapiPhoneNumber> {
    try {
      // Create phone number with assistant and all configuration in one request
      const payload: any = {
        provider: 'twilio',
        number, // Use 'number' field, not 'phoneNumber'
        assistantId,
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      }
      
      // Add server URL configuration if provided
      if (options?.serverUrl) {
        payload.serverUrl = options.serverUrl
      }
      
      // Add server URL secret if provided
      if (options?.serverUrlSecret) {
        payload.serverUrlSecret = options.serverUrlSecret
      }
      
      // Add fallback destination if provided
      if (options?.fallbackDestination) {
        payload.fallbackDestination = {
          type: 'number',
          number: options.fallbackDestination,
        }
      }
      
      const response = await this.client.post('/phone-number', payload)
      return response.data
    } catch (error: any) {
      const details = error.response?.data || error.message
      console.error('Vapi purchasePhoneNumber error:', details)
      if (ENABLE_MOCK_MODE) {
        return {
          id: `mock-number-${Date.now()}`,
          number,
          provider: 'twilio',
          assistantId,
        }
      }
      throw new Error(typeof details === 'string' ? details : JSON.stringify(details))
    }
  }

  async attachNumberToAssistant(numberId: string, assistantId: string): Promise<VapiPhoneNumber> {
    try {
      const response = await this.client.patch(`/phone-number/${numberId}`, {
        assistantId,
      })
      return response.data
    } catch (error: any) {
      console.error('Vapi attachNumberToAssistant error:', error.response?.data || error.message)
      throw new Error('Failed to attach number to assistant')
    }
  }

  async updatePhoneNumber(numberId: string, updates: { assistantId?: string; fallbackDestination?: string }): Promise<VapiPhoneNumber> {
    try {
      const payload: any = {}
      if (updates.assistantId) {
        payload.assistantId = updates.assistantId
      }
      if (updates.fallbackDestination) {
        payload.fallbackDestination = {
          type: 'number',
          number: updates.fallbackDestination,
        }
      }
      console.log(`[Vapi] PATCH /phone-number/${numberId}`, JSON.stringify(payload, null, 2))
      const response = await this.client.patch(`/phone-number/${numberId}`, payload)
      console.log(`[Vapi] Response:`, JSON.stringify(response.data, null, 2))
      return response.data
    } catch (error: any) {
      console.error('Vapi updatePhoneNumber error:', error.response?.data || error.message)
      throw new Error('Failed to update phone number')
    }
  }

  async transferCall(callId: string, phoneNumber: string): Promise<any> {
    try {
      const response = await this.client.post(`/call/${callId}/transfer`, {
        phoneNumber,
      })
      return response.data
    } catch (error: any) {
      console.error('Vapi transferCall error:', error.response?.data || error.message)
      throw new Error('Failed to transfer call')
    }
  }

  async deletePhoneNumber(numberId: string): Promise<void> {
    try {
      await this.client.delete(`/phone-number/${numberId}`)
    } catch (error: any) {
      console.error('Vapi deletePhoneNumber error:', error.response?.data || error.message)
      throw new Error('Failed to delete phone number from Vapi')
    }
  }
}

export function createVapiClient(): VapiClient {
  return new VapiClient()
}

export function buildAssistantPrompt(projectName: string, trade: string): string {
  const tradeContext = {
    plumbing: 'plumbing emergencies like leaks, clogs, water heaters, and burst pipes',
    hvac: 'heating and cooling issues, AC repair, furnace problems, and HVAC maintenance',
    electrical: 'electrical emergencies like power outages, circuit breakers, wiring issues, and panel repairs'
  }[trade] || `${trade} services`

  return `You are the friendly AI receptionist for ${projectName}, a professional ${trade} company specializing in ${tradeContext}.

**IMPORTANT - CURRENT DATE/TIME:**
Today is: {{"now" | date: "%A, %B %d, %Y at %I:%M %p", "America/Chicago"}} CST
ISO Format: {{"now" | date: "%Y-%m-%dT%H:%M:%S.000Z", "UTC"}}
When booking appointments, ALWAYS use dates/times that are NOW or in the FUTURE. Never use past dates.

**VOICE & TONE:**
- Warm, empathetic, and reassuring
- Speak naturally like a helpful neighbor, not a robot
- Use casual language: "Hey there", "I got you", "Let's get this sorted"
- Show genuine concern for emergencies

**YOUR EXPERTISE:** You handle ${tradeContext}. If someone mentions an unrelated service, politely clarify: "Just to confirm, you need ${trade} service, right?"

**OPENING (Choose based on time):**
- Day: "Hey there, thanks for calling! I can help you right away. What's going on?"
- Night/Emergency: "Hi, thanks for calling. Don't worry, I'm here to help. What's the emergency?"

**PRIMARY GOAL:** Book the job as fast as possible while making customer feel heard.

**CONVERSATION FLOW (Confirm before booking):**
1) **Listen First** - Let customer explain the issue fully. Don't interrupt.
2) **Show Empathy** - Brief acknowledgment: "Oh man, that sounds stressful"
3) **Gather Info ONE AT A TIME** - NEVER ask multiple questions in one turn. Wait for their answer before asking the next question.
   - Name: "Who am I speaking with?"
   - Phone: "What's the best number to reach you?"
   - Address: "Where are you located?"
   - **If customer provides apartment/unit number:** Include it in the address (e.g., "123 Main St, Apt 4B")
   - **If address seems incomplete:** Ask "Is there an apartment or unit number?"
   - Issue: If they haven't mentioned it yet, ask: "What's going on?"
   - Timing preference: "When works better for you - morning or afternoon?"
     * Listen to their preference (morning, afternoon, or specific times like "2pm", "tomorrow morning", etc.)
     * If customer says "now", "ASAP", "immediately", "emergency" → use current time + 30 minutes
     * If customer gives specific time like "2pm" or "this afternoon" → use TODAY at that time
     * NEVER use dates in the past - always use today or future dates
4) **Check Availability → Propose → Confirm → Book**
   - AFTER understanding preference, call get_slots to check what's actually available
   - **IMMEDIATELY after get_slots returns slots:** Pick the FIRST slot that matches preference (if morning requested, pick first AM slot; if afternoon, pick first PM slot)
   - **DO NOT call get_slots again** - use the slots you already have
   - **IMMEDIATELY propose the time** to the customer. Say: "I can get someone out there at [time]. Does that work?"
   - If they say YES → IMMEDIATELY call book_slot with \`confirm=true\`
   - If they say NO or want different time → propose the NEXT available slot from the same list
   - Pass to book_slot: customerName, customerPhone, address, notes (issue), startTime (ISO), confirm=true, service if known
   - Wait for book_slot response before speaking
5) **AFTER booking succeeds**, say: "Perfect! You're all set for [time]. We'll text you the details."
6) **NEVER call the notify or escalate_owner functions** - System handles all notifications automatically

**CRITICAL: ASK ONLY ONE QUESTION PER RESPONSE**
WRONG: "I need your name, phone number, and address"
RIGHT: "Who am I speaking with?" → wait for answer → "What's the best number to reach you?" → wait → etc.

**CRITICAL RULES:**
- NEVER ask for the same information twice
- NEVER re-confirm phone numbers or addresses
- Keep moving forward - don't loop
- If you already have a piece of info, skip to the next question
- Book as soon as you have: name, phone, address, issue, time

**EMPATHY & GUARDRAILS:**
- Speak calmly and reassuringly
- Keep responses SHORT (1-2 sentences max)
- Use affirming language: "Got it", "Perfect", "I'm on it"
- If caller sounds panicked, say: "I'm connecting you to our emergency line"

**WEEKEND/ON-CALL POLICY:**
- If weekend booking is disabled or no on-call tech is available (policy requires on-call), offer the earliest weekday morning instead.

**AVAILABLE FUNCTIONS:**
You have access to these functions:
1. **book_slot** - Book appointments AFTER customer agrees. Pass confirm=true and include service when known.
2. **get_slots** - Get available booking time slots within a date range. Call this before proposing times to the caller.
3. **get_pricing** - Fetch the current pricing sheet summary (trip fee, service examples, emergency multiplier, notes)
4. **check_service_area** - Check if address is within service coverage area
5. **get_knowledge** - Get FAQs, warranty info, and service area details

**WHEN TO USE FUNCTIONS:**
- Customer wants to book? → Call get_slots to check availability, then propose time and use book_slot with confirm=true
- Customer asks "when can you come?" → Call get_slots to find next available slots
- Customer asks about pricing/services? → Call get_pricing and use its values; keep answers short
- Customer asks about service area? → Call check_service_area with their address
- Customer has questions about policies/warranty? → Call get_knowledge

**HARD RULES:**
- NEVER invent availability - always call book_slot to check
- NEVER ask for credit card info by phone - say "We'll send a secure payment link"
- Keep responses SHORT (1-2 sentences max)
- Don't apologize excessively - be solution-focused
- If customer rambles, gently redirect: "Got it. Let me get you booked..."
- NEVER make medical or safety judgments - escalate if uncertain

**EXAMPLES:**

❌ BAD: "Hello, this is the automated receptionist for ${projectName}. Please provide your full name, phone number, and..."
✅ GOOD: "Hey! ${projectName} here. What can I help you with?"

❌ BAD: "I understand you have a leaking pipe. Can you provide the exact location of the leak?"
✅ GOOD: "Oh no, a leak? That's rough. Where's it leaking from?"

❌ BAD: "Your appointment has been scheduled for 2:30 PM."
✅ GOOD: "You're all set! Mike will be there at 2:30. I'm texting you the details now."

Remember: You're not just booking jobs - you're calming stressed people and saving their day. Be human.`
}

export function buildAssistantTools(appUrl: string, projectId?: string): VapiAssistantTool[] {
  const isSecure = appUrl.startsWith('https://') || appUrl.startsWith('wss://')
  const isLocalDev = appUrl.startsWith('http://localhost') || appUrl.startsWith('http://127.0.0.1')
  const allowInsecureInDev = process.env.NODE_ENV !== 'production'
  if (!isSecure && !(isLocalDev || allowInsecureInDev)) {
    console.warn('Vapi tools disabled: non-secure appUrl detected', appUrl)
    return []
  }
  const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
  return [
    {
      type: 'function',
      function: {
        name: 'book_slot',
        description: 'Propose a time, then call again with confirm=true after the customer clearly agrees. Include service name when known for accurate duration.',
        parameters: {
          type: 'object',
          properties: {
            customerName: { type: 'string', description: 'Customer full name' },
            customerPhone: { type: 'string', description: 'Customer phone number' },
            address: { type: 'string', description: 'Service address' },
            notes: { type: 'string', description: 'Issue description and special notes' },
            startTime: { type: 'string', description: 'Requested start time in ISO format' },
            priorityUpsell: { type: 'boolean', description: 'Whether customer wants priority arrival (+$50)' },
            confirm: { type: 'boolean', description: 'Set true only after caller explicitly agrees to book' },
            service: { type: 'string', description: 'Specific service name when known (e.g., Drain Cleaning)' },
          },
          required: ['customerName', 'customerPhone', 'address', 'notes', 'startTime'],
        },
      },
      server: {
        url: `${appUrl}/api/book${q}`,
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_slots',
        description: 'Get available booking time slots. Returns array of slots with "start" timestamps. After calling this, immediately propose the first matching time to the customer.',
        parameters: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'ISO start datetime (optional, defaults to now)' },
            end: { type: 'string', description: 'ISO end datetime (optional, defaults to 7 days ahead)' },
          },
        },
      },
      server: {
        url: `${appUrl}/api/calcom/availability${q}`,
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_pricing',
        description: 'Fetch current pricing sheet summary (trip fee, services, notes). Always call this when discussing pricing.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      server: {
        url: `${appUrl}/api/pricing/assistant${q}`,
      },
    },
    {
      type: 'function',
      function: {
        name: 'find_gaps',
        description: 'Find unassigned bookings and suggest best technician assignments for smart scheduling.',
        parameters: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'ISO start datetime (optional, defaults to now)' },
            end: { type: 'string', description: 'ISO end datetime (optional, defaults to 7 days ahead)' },
          },
        },
      },
      server: {
        url: `${appUrl}/api/gaps${q}`,
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_knowledge',
        description: 'Get FAQs, warranty info, service area coverage, and knowledge snippets. Call this when customer asks questions about policies, coverage, or service details.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      server: {
        url: `${appUrl}/api/knowledge${q}`,
      },
    },
    {
      type: 'function',
      function: {
        name: 'check_service_area',
        description: 'Check if a customer address is within the service area coverage. Call this after getting the address but before booking to ensure we can service them.',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Full service address to check' },
          },
          required: ['address'],
        },
      },
      server: {
        url: `${appUrl}/api/service-area/check${q}`,
      },
    },
  ]
}
