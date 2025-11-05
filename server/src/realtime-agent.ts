import OpenAI from 'openai'
import WebSocket from 'ws'
import { prisma } from './db.js'
import { AudioBufferManager } from './audio-buffer.js'

interface RealtimeEvent {
  type: string
  [key: string]: any
}

interface PerformanceMetrics {
  audioChunksReceived: number
  audioChunksSent: number
  audioBytesReceived: number
  audioBytesSent: number
  functionCallsCount: number
  connectionTime: number
  lastAudioReceivedTime: number | null
  lastAudioSentTime: number | null
}

export class RealtimeAgent {
  private client: OpenAI
  private sessionId: string | null = null
  private projectId: string
  private agentId: string
  private ws: WebSocket | null = null
  private audioCallbacks: Array<(audio: Buffer) => void> = []
  private functionCallCallbacks: Array<(name: string, args: any) => Promise<any>> = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private isConnecting = false
  private isConnected = false
  private activeFunctionCalls = new Map<string, { name: string; args: any }>() // Track function call IDs
  private inputAudioBuffer: AudioBufferManager | null = null // Day 5: Audio buffering for input
  private metrics: PerformanceMetrics // Day 5: Performance tracking
  private transcriptSegments: Array<{ role: 'user' | 'assistant'; text: string; timestamp: Date }> = [] // Day 8: Transcript tracking

  constructor(projectId: string, agentId: string) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    })
    this.projectId = projectId
    this.agentId = agentId
    
    // Initialize performance metrics
    this.metrics = {
      audioChunksReceived: 0,
      audioChunksSent: 0,
      audioBytesReceived: 0,
      audioBytesSent: 0,
      functionCallsCount: 0,
      connectionTime: Date.now(),
      lastAudioReceivedTime: null,
      lastAudioSentTime: null,
    }
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      console.log('[RealtimeAgent] Already connecting/connected, skipping')
      return
    }

    this.isConnecting = true
    console.log(`[RealtimeAgent] Connecting to OpenAI Realtime API for project ${this.projectId}, agent ${this.agentId}`)

    try {
      // Load agent and project data from database
      const agent = await prisma.agent.findUnique({
        where: { id: this.agentId },
        include: { 
          project: {
            include: {
              numbers: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' }, // Get most recent phone number first
                take: 1,
              },
            },
          },
        },
      })

      if (!agent || !agent.project) {
        throw new Error(`Agent or project not found: agentId=${this.agentId}, projectId=${this.projectId}`)
      }

      // Get the most recently assigned phone number
      const mostRecentNumber = agent.project.numbers[0]?.e164 || null

      // Build system prompt and tools (similar to Vapi setup)
      const systemPrompt = this.buildSystemPrompt(agent.project.name, agent.project.trade, mostRecentNumber)
      const tools = await this.buildTools(agent.project)

      // Get Realtime API WebSocket URL
      // OpenAI Realtime API uses: wss://api.openai.com/v1/realtime?model=...&api_key=...
      const model = 'gpt-4o-realtime-preview-2024-12-17'
      const apiKey = process.env.OPENAI_API_KEY || ''
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`
      
      // Create WebSocket connection with custom headers
      // Note: ws library supports headers in options
      const ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      })

      this.ws = ws

      // Wait for WebSocket to actually open before returning
      await new Promise<void>((resolve, reject) => {
        // Set up event handlers
        ws.on('open', () => {
          console.log('[RealtimeAgent] WebSocket connected to OpenAI Realtime API')
          this.isConnecting = false
          this.isConnected = true
          this.reconnectAttempts = 0
          
          // Initialize input audio buffer (Day 5: Buffer management)
          // Target: ~100ms chunks (4800 bytes at 24kHz PCM16 mono)
          this.inputAudioBuffer = new AudioBufferManager(
            (bufferedAudio: Buffer) => {
              // Flush callback: send buffered audio to OpenAI
              this.sendBufferedAudio(bufferedAudio)
            },
            4800, // ~100ms at 24kHz PCM16
            50    // Flush every 50ms max
          )
          
          // Create session with configuration
          this.createSession(systemPrompt, tools)
          
          // Resolve the promise - connection is ready
          resolve()
        })

        ws.on('error', (error) => {
          console.error('[RealtimeAgent] WebSocket connection error:', error)
          this.isConnecting = false
          reject(error)
        })
      })

      ws.on('message', (data: Buffer) => {
        try {
          const event: RealtimeEvent = JSON.parse(data.toString())
          this.handleEvent(event)
        } catch (error) {
          console.error('[RealtimeAgent] Error parsing message:', error)
        }
      })

                   ws.on('error', async (error) => {
               console.error('[RealtimeAgent] WebSocket error:', error)
               this.isConnecting = false
               this.isConnected = false
               
               // Week 4, Day 20: Send alert for OpenAI connection errors
               try {
                 const { sendAlert, Alerts, getAlertConfig } = await import('./monitoring/alerts.js')
                                   await sendAlert(
                    Alerts.openaiError(error.message || 'WebSocket connection error', this.projectId),
                    getAlertConfig()
                  )
               } catch (alertError: any) {
                 console.error('[RealtimeAgent] Failed to send alert:', alertError)
               }
               
               this.handleReconnect()
             })

             ws.on('close', (code: number, reason: Buffer) => {
         const reasonStr = reason.toString()
         console.log(`[RealtimeAgent] WebSocket closed: ${code} - ${reasonStr}`)
         this.isConnected = false
         this.isConnecting = false
         this.ws = null
         this.sessionId = null
         
         // Attempt reconnect if not intentional
         if (code !== 1000) { // 1000 = normal closure
           this.handleReconnect()
         }
       })

    } catch (error: any) {
      console.error('[RealtimeAgent] Connection error:', error)
      this.isConnecting = false
      throw error
    }
  }

  private createSession(systemPrompt: string, tools: any[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[RealtimeAgent] Cannot create session: WebSocket not open')
      return
    }

    console.log('[RealtimeAgent] Creating session with system prompt and tools')

    // Send session.update event to configure the session
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'], // Enable both text and audio
        instructions: systemPrompt,
        voice: 'alloy', // Default voice, can be customized
        input_audio_format: 'g711_ulaw', // Input as μ-law directly from Twilio (8kHz, no conversion!)
        output_audio_format: 'g711_ulaw', // Output as μ-law directly (8kHz, no conversion needed!)
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad', // Use server-side voice activity detection
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
                 tools: tools.map(tool => ({
           type: 'function',
           name: tool.name,
           description: tool.description,
           parameters: tool.parameters || {},
         })),
        tool_choice: 'auto',
        temperature: 0.7,
        max_response_output_tokens: 4096,
      },
    }

    this.ws.send(JSON.stringify(sessionUpdate))
    console.log('[RealtimeAgent] Session configuration sent')
  }

  private async handleEvent(event: RealtimeEvent): Promise<void> {
    // Log all events in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RealtimeAgent] Event: ${event.type}`, event)
    }

    switch (event.type) {
      case 'session.created':
        this.sessionId = event.session?.id || null
        console.log(`[RealtimeAgent] Session created: ${this.sessionId}`)
        break

      case 'session.updated':
        console.log('[RealtimeAgent] Session updated - triggering initial greeting')
        // Session is ready - trigger initial greeting so assistant speaks first
        // The system prompt instructs the assistant to greet, but we need to trigger a response
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'response.create',
            response: {
              modalities: ['audio', 'text'],
              instructions: 'Greet the caller with a friendly welcome. Say something like "Hey there, thanks for calling! I can help you right away. What\'s going on?" Keep it brief and natural.',
            }
          }))
          console.log('[RealtimeAgent] Initial greeting triggered')
        }
        break

      case 'response.audio_transcript.delta':
        // AI is speaking - we'll handle audio in response.audio.delta
        break

      case 'response.audio.delta':
        // AI audio chunk - forward to Twilio
        if (event.delta) {
          // OpenAI sends base64-encoded PCM16 audio
          const audioBuffer = Buffer.from(event.delta, 'base64')
          
          console.log(`[RealtimeAgent] 🔊 Received audio chunk: ${audioBuffer.length} bytes`)
          
          // Day 5: Update metrics
          this.metrics.audioBytesReceived += audioBuffer.length
          this.metrics.lastAudioReceivedTime = Date.now()
          
          this.triggerAudioCallbacks(audioBuffer)
        }
        break

      case 'response.audio_transcript.done':
        // AI finished speaking
        console.log('[RealtimeAgent] AI finished speaking:', event.transcript)
        // Day 8: Store AI transcript segment
        if (event.transcript) {
          this.transcriptSegments.push({
            role: 'assistant',
            text: event.transcript,
            timestamp: new Date(),
          })
        }
        break

      case 'conversation.item.input_audio_transcription.completed':
        // User spoke - transcription available
        console.log('[RealtimeAgent] 🎤 User said:', event.transcript)
        // Day 8: Store user transcript segment
        if (event.transcript) {
          this.transcriptSegments.push({
            role: 'user',
            text: event.transcript,
            timestamp: new Date(),
          })
        }
        break

      case 'response.function_call_arguments.done':
        // Function call received - store it until we can execute it
        const functionCall = event.function_call
        if (functionCall && event.item_id) {
          this.activeFunctionCalls.set(event.item_id, {
            name: functionCall.name,
            args: functionCall.arguments,
          })
        }
        break

      case 'response.function_call_result.done':
        // Function call ready to execute
        if (event.item_id && this.activeFunctionCalls.has(event.item_id)) {
          const func = this.activeFunctionCalls.get(event.item_id)!
          this.activeFunctionCalls.delete(event.item_id)
          
          // Day 5: Track function call metrics
          this.metrics.functionCallsCount++
          
          this.handleFunctionCall(event.item_id, func.name, func.args)
        }
        break

      case 'response.done':
        // Response complete
        console.log('[RealtimeAgent] ✅ Response done:', event.response?.status)
        break

                   case 'error':
               console.error('[RealtimeAgent] Error event:', event.error)
               // Week 4, Day 20: Send alert for OpenAI API errors
               this.sendOpenAIAlert(event.error).catch(console.error)
               break

      default:
        // Unhandled event type
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RealtimeAgent] Unhandled event type: ${event.type}`)
        }
    }
  }

  private async handleFunctionCall(itemId: string, functionName: string, args: any): Promise<void> {
    console.log(`[RealtimeAgent] Function call: ${functionName} (item_id: ${itemId})`, args)

    try {
      // Parse arguments if they're a string
      const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args

      // Call all registered callbacks
      const results = await Promise.all(
        this.functionCallCallbacks.map(callback => callback(functionName, parsedArgs))
      )

      // Use the first result (or you could merge them)
      const result = results[0] || { result: 'Function executed successfully' }

      // Send function result back to OpenAI
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const response = {
          type: 'response.function_call_result.create',
          item_id: itemId,
          result: typeof result === 'string' ? result : JSON.stringify(result),
        }

        this.ws.send(JSON.stringify(response))
        console.log(`[RealtimeAgent] Function result sent for ${functionName}`)
      }
    } catch (error: any) {
      console.error(`[RealtimeAgent] Error handling function call ${functionName}:`, error)
      
      // Send error back to OpenAI
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const errorResponse = {
          type: 'response.function_call_result.create',
          item_id: itemId,
          result: JSON.stringify({ error: error.message }),
        }
        this.ws.send(JSON.stringify(errorResponse))
      }
    }
  }

  sendAudio(audioChunk: Buffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[RealtimeAgent] Cannot send audio: WebSocket not open')
      return
    }

    // Day 5: Use buffer manager for efficient audio chunking
    if (this.inputAudioBuffer) {
      // Update metrics
      this.metrics.audioChunksReceived++
      this.metrics.audioBytesReceived += audioChunk.length
      this.metrics.lastAudioReceivedTime = Date.now()
      
      // Add to buffer (will flush when ready)
      this.inputAudioBuffer.add(audioChunk)
    } else {
      // Fallback: send immediately if buffer not initialized
      this.sendBufferedAudio(audioChunk)
    }
  }

  /**
   * Send buffered audio to OpenAI (internal method)
   * Day 5: Optimized audio sending with metrics
   */
  private sendBufferedAudio(audioChunk: Buffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[RealtimeAgent] Cannot send audio: WebSocket not open')
      return
    }

    // OpenAI Realtime API expects base64-encoded PCM16 audio
    const base64Audio = audioChunk.toString('base64')

    const audioMessage = {
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    }

    this.ws.send(JSON.stringify(audioMessage))
    
    console.log(`[RealtimeAgent] 📤 Sent audio chunk: ${audioChunk.length} bytes`)
    
    // Update metrics
    this.metrics.audioChunksSent++
    this.metrics.audioBytesSent += audioChunk.length
    this.metrics.lastAudioSentTime = Date.now()
  }

  private triggerAudioCallbacks(audio: Buffer): void {
    for (const callback of this.audioCallbacks) {
      try {
        callback(audio)
      } catch (error) {
        console.error('[RealtimeAgent] Error in audio callback:', error)
      }
    }
  }

  onAudio(callback: (audio: Buffer) => void): void {
    this.audioCallbacks.push(callback)
  }

  onFunctionCall(callback: (name: string, args: any) => Promise<any>): void {
    this.functionCallCallbacks.push(callback)
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RealtimeAgent] Max reconnect attempts reached, giving up')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000) // Exponential backoff, max 10s

    console.log(`[RealtimeAgent] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`)

    setTimeout(async () => {
      try {
        await this.connect()
      } catch (error) {
        console.error('[RealtimeAgent] Reconnect failed:', error)
      }
    }, delay)
  }

  async disconnect(): Promise<void> {
    console.log('[RealtimeAgent] Disconnecting...')
    this.isConnecting = false
    this.isConnected = false

    // Day 5: Clean up audio buffer
    if (this.inputAudioBuffer) {
      this.inputAudioBuffer.destroy()
      this.inputAudioBuffer = null
    }

    if (this.ws) {
      // Send session end event
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'session.end' }))
      }
      this.ws.close(1000, 'Normal closure')
      this.ws = null
    }

    this.sessionId = null
    this.reconnectAttempts = 0
  }

  /**
   * Get performance metrics (Day 5)
   */
  getMetrics(): PerformanceMetrics & { 
    uptime: number // Connection uptime in ms
    averageLatency?: number // Average audio latency (if calculable)
  } {
    const uptime = Date.now() - this.metrics.connectionTime
    
    // Calculate average latency if we have both send and receive times
    let averageLatency: number | undefined
    if (this.metrics.lastAudioReceivedTime && this.metrics.lastAudioSentTime) {
      // Rough estimate: time between last sent and received
      averageLatency = Math.abs(this.metrics.lastAudioSentTime - this.metrics.lastAudioReceivedTime)
    }

    return {
      ...this.metrics,
      uptime,
      averageLatency,
    }
  }

  /**
   * Get full transcript (Day 8)
   */
  getTranscript(): string {
    // Combine all transcript segments in chronological order
    return this.transcriptSegments
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(seg => `${seg.role === 'user' ? 'Customer' : 'AI'}: ${seg.text}`)
      .join('\n\n')
  }

  /**
   * Get transcript segments (Day 8)
   */
  getTranscriptSegments(): Array<{ role: 'user' | 'assistant'; text: string; timestamp: Date }> {
    return [...this.transcriptSegments]
  }

           getSessionId(): string | null {
           return this.sessionId
         }
         
         /**
          * Send alert for OpenAI API errors (Week 4, Day 20)
          */
         private async sendOpenAIAlert(error: any): Promise<void> {
           try {
             const { sendAlert, Alerts, getAlertConfig } = await import('./monitoring/alerts.js')
             const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown OpenAI API error'
                           await sendAlert(
                Alerts.openaiError(errorMessage, this.projectId),
                getAlertConfig()
              )
           } catch (alertError: any) {
             console.error('[RealtimeAgent] Failed to send OpenAI alert:', alertError)
           }
         }

  isConnectionOpen(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  private getWebSocketReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }

  // Helper methods to build prompt and tools (similar to Vapi implementation)
  // Note: In production, these should be imported from a shared utilities file
  private buildSystemPrompt(projectName: string, trade: string, phoneNumber: string | null = null): string {
    const normalizedTrade = trade.toLowerCase()
    
    // Trade-specific context and emergency indicators (Week 2, Day 6 - Emergency Triage)
    const tradeConfig = {
      plumbing: {
        context: 'plumbing emergencies like leaks, clogs, water heaters, and burst pipes',
        emergencyKeywords: ['burst pipe', 'flooding', 'water everywhere', 'sewage backup', 'gas smell', 'no water', 'actively leaking', 'gushing water'],
        emergencyQuestions: [
          'Is water actively leaking or gushing?',
          'Is there a burst pipe?',
          'Is there sewage backup in the house?',
          'Can you smell gas near the water heater or plumbing fixtures?',
          'Do you have no running water at all?'
        ],
        routineIndicators: ['slow drain', 'dripping faucet', 'toilet running', 'low water pressure', 'want to schedule maintenance'],
        serviceTypes: ['leak repair', 'drain cleaning', 'water heater repair/replacement', 'pipe repair', 'fixture installation', 'sewer line repair', 'repiping']
      },
      hvac: {
        context: 'heating and cooling issues, AC repair, furnace problems, and HVAC maintenance',
        emergencyKeywords: ['no heat', 'furnace down', 'furnace not working', 'furnace broke', 'heat not working', 'freezing', 'carbon monoxide', 'burning smell', 'system off for days', 'no AC in heat wave', 'children elderly'],
        emergencyQuestions: [
          'Is there no heat or is the furnace completely not working?',
          'Is your home currently freezing or dangerously hot?',
          'Are there young children or elderly people in the home?',
          'Has the system been completely off for more than 24 hours?',
          'Do you smell gas or a burning odor coming from the system?',
          'Is this a carbon monoxide concern?'
        ],
        routineIndicators: ['not cooling well', 'strange noises', 'want maintenance', 'filter replacement', 'routine tune-up'],
        serviceTypes: ['AC repair', 'furnace repair', 'heat pump service', 'ductwork repair', 'thermostat installation', 'maintenance/tune-up', 'system replacement']
      },
      electrical: {
        context: 'electrical emergencies like power outages, circuit breakers, wiring issues, and panel repairs',
        emergencyKeywords: ['sparking', 'smoke', 'burning smell', 'electric shock', 'no power whole house', 'exposed wires', 'hot outlet', 'arcing'],
        emergencyQuestions: [
          'Are you seeing sparks or smoke from outlets or electrical panels?',
          'Did someone get an electric shock?',
          'Is there a burning smell coming from electrical equipment?',
          'Is there no power to your entire house (not just one circuit)?',
          'Are there exposed wires or damaged electrical equipment?'
        ],
        routineIndicators: ['outlet not working', 'light switch issue', 'want to add outlets', 'circuit breaker keeps tripping', 'routine inspection'],
        serviceTypes: ['panel upgrade', 'outlet installation/repair', 'wiring repair', 'circuit breaker service', 'lighting installation', 'safety inspection', 'GFCI installation']
      }
    }[normalizedTrade] || {
      context: `${trade} services`,
      emergencyKeywords: ['emergency', 'urgent', 'asap', 'immediately'],
      emergencyQuestions: ['Is this an emergency situation requiring immediate attention?'],
      routineIndicators: ['schedule', 'routine', 'maintenance'],
      serviceTypes: ['service', 'repair', 'installation']
    }

    // Build emergency triage section
    const emergencyTriageSection = `**🚨 EMERGENCY TRIAGE (Critical - Week 2 Feature)**

Your PRIMARY job is to distinguish EMERGENCY calls from ROUTINE calls to prevent unnecessary technician burnout.

**EMERGENCY INDICATORS (${trade.toUpperCase()}):**
Listen for these keywords: ${tradeConfig.emergencyKeywords.join(', ')}

**TRIAGE PROCESS:**
1. **After customer describes issue**, ask 1-2 clarifying questions from this list:
${tradeConfig.emergencyQuestions.map((q, i) => `   ${i + 1}. "${q}"`).join('\n')}

2. **CLASSIFY THE CALL:**
   - **EMERGENCY**: If answer is YES to emergency questions → Book IMMEDIATE/SAME-DAY slot
   - **ROUTINE**: If it's ${tradeConfig.routineIndicators.join(', ')} → Book NEXT-DAY or later slot

3. **ROUTING LOGIC:**
   - EMERGENCY → Use get_slots for TODAY, prioritize earliest available time
   - ROUTINE → Use get_slots for TOMORROW or later, offer next available routine slot

**WHY THIS MATTERS:**
- Reduces technician burnout by 40-60% (research validated)
- Prevents "stupid after-hours calls" (HVAC tech pain point)
- Ensures true emergencies get immediate response
- Routines get next-day service (acceptable for non-urgent issues)

**EXAMPLES:**
- Customer: "My pipe burst and water is everywhere!" → EMERGENCY → "This sounds urgent. Let me get someone to you right away..."
- Customer: "My drain is slow" → ROUTINE → "I can get someone out tomorrow morning. Does that work?"

`

    // Format phone number for display if available
    const phoneDisplay = phoneNumber 
      ? phoneNumber.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') 
      : null
    
    const phoneInfo = phoneDisplay 
      ? `\n**YOUR PHONE NUMBER:** ${phoneDisplay} (${phoneNumber}) - This is the number customers can call to reach ${projectName}.`
      : ''
    
    return `You are the friendly AI receptionist for ${projectName}, a professional ${trade} company specializing in ${tradeConfig.context}.${phoneInfo}

**VOICE & TONE:**
- Warm, empathetic, and reassuring
- Speak naturally like a helpful neighbor
- Use casual language: "Hey there", "I got you", "Let's get this sorted"
- Show genuine concern for emergencies, stay calm and solution-focused

**YOUR EXPERTISE:** 
You handle ${tradeConfig.context}. You understand ${trade} terminology and common issues:
${tradeConfig.serviceTypes.map(st => `- ${st}`).join('\n')}

If someone mentions an unrelated service, politely clarify: "Just to confirm, you need ${trade} service, right?"

${emergencyTriageSection}

**CONVERSATION FLOW - MUST FOLLOW EXACTLY:**
1. **Listen First** - Let customer explain the issue fully. Don't interrupt.

2. **Triage the Issue** - Use emergency triage process above to classify as EMERGENCY or ROUTINE
   - For HVAC: "furnace down", "no heat", "furnace not working" = EMERGENCY (especially in winter)
   - Ask 1-2 clarifying questions from emergency list if needed

3. **Show Empathy** - Brief acknowledgment: "Oh man, that sounds stressful" or "I understand, let's get this sorted"

4. **Gather ALL REQUIRED INFO BEFORE BOOKING** - You MUST collect ALL of these before calling get_slots or book_slot:
   - **Name**: "Who am I speaking with?" → WAIT for answer
   - **Phone**: "What's the best number to reach you?" (10 digits, no country code) → WAIT for answer
   - **Address**: "Where are you located?" (must include street number, street name, city) → WAIT for answer
     * If address incomplete: "What's the street number and city?"
     * Ask for apartment/unit if needed
   - **Issue**: If not mentioned, ask: "What's going on?" → WAIT for answer

5. **ONLY AFTER YOU HAVE: name, phone, address, and issue** → Check Availability & Book:
   - For EMERGENCY calls: Call get_slots with isEmergency=true for TODAY
   - For ROUTINE calls: Ask "Do you prefer morning or afternoon?" → WAIT → Then call get_slots for TOMORROW+
   - Propose ONLY times from get_slots result - NEVER invent availability
   - When customer agrees to a time, call book_slot with ALL collected info: customerName, customerPhone, address, notes (issue), startTime
   - Wait for booking confirmation before continuing

**CRITICAL RULES - NEVER VIOLATE:**
- **NEVER call get_slots or book_slot until you have: name, phone, address, and issue**
- Ask ONE question at a time - wait for answer before next question
- Never invent availability - only use times from get_slots
- Keep responses SHORT (1-2 sentences max)
- Never ask for credit card info - say "We'll send a secure payment link"
- EMERGENCY calls get priority booking (TODAY), ROUTINE calls get next-day slots
- If customer says "furnace down" or "no heat" = EMERGENCY for HVAC (book today)

**AFTER BOOKING:**
Say: "Perfect! You're all set for [time]. We'll text you the details."`
  }

  private async buildTools(project: any): Promise<any[]> {
    // Build tools similar to Vapi implementation
    // Week 2: Enhanced with knowledge base and emergency-aware booking
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return [
      {
        name: 'get_slots',
        description: 'Get available booking time slots. For EMERGENCY calls, set isEmergency=true to get same-day slots. For ROUTINE calls, use tomorrow or later. Returns a list of times in the "result" field.',
        parameters: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'ISO start datetime. For emergencies, use today/now. For routine, use tomorrow.' },
            end: { type: 'string', description: 'ISO end datetime (optional, defaults to 7 days ahead)' },
            isEmergency: { type: 'boolean', description: 'Set true for emergency calls to prioritize same-day availability' },
          },
          required: [],
        },
      },
      {
        name: 'book_slot',
        description: 'Book an appointment slot. Use confirm=true after customer agrees. Include service name when known.',
        parameters: {
          type: 'object',
          properties: {
            customerName: { type: 'string', description: 'Customer full name' },
            customerPhone: { type: 'string', description: 'Customer phone number (10 digits, no country code)' },
            address: { type: 'string', description: 'Service address (include apartment/unit if provided)' },
            notes: { type: 'string', description: 'Issue description and any special notes' },
            startTime: { type: 'string', description: 'Start time in ISO format from get_slots' },
            confirm: { type: 'boolean', description: 'Set true only after caller explicitly agrees to book' },
            service: { type: 'string', description: 'Specific service name when known (e.g., "Drain Cleaning", "AC Repair")' },
          },
          required: ['customerName', 'customerPhone', 'address', 'startTime'],
        },
      },
      {
        name: 'get_pricing',
        description: 'Fetch current pricing sheet summary (trip fee, services, emergency multiplier, notes). Always call this when customer asks about pricing.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_knowledge',
        description: 'Query knowledge base for FAQs, warranty info, service area details, and trade-specific information. Use this when customer asks about policies, warranties, or service details.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'check_service_area',
        description: 'Check if a service address is within the configured service area. Use this before booking to verify coverage.',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Service address to check' },
          },
          required: ['address'],
        },
      },
    ]
  }
}
