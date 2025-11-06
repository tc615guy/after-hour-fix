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
  private projectName: string = '' // Store project name for greeting
  private customGreeting: string = '' // Store custom greeting from AI settings
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

      // Store project info for custom greeting
      this.projectName = agent.project.name
      const aiSettings: any = (agent.project as any).aiSettings || {}
      this.customGreeting = aiSettings.customGreeting || ''
      
      console.log(`[RealtimeAgent] Custom greeting: ${this.customGreeting ? 'SET' : 'NOT SET'}`)

      // Get the most recently assigned phone number
      const mostRecentNumber = agent.project.numbers[0]?.e164 || null

      // Build system prompt and tools (similar to Vapi setup)
      let systemPrompt = this.buildSystemPrompt(agent.project.name, agent.project.trade, mostRecentNumber, aiSettings)
      
      // Append pricing data from agent.basePrompt if available (set by push-pricing endpoint)
      if (agent.basePrompt) {
        console.log(`[RealtimeAgent] Appending pricing data from basePrompt (${agent.basePrompt.length} chars)`)
        systemPrompt += agent.basePrompt
      }
      
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
          threshold: 0.6, // Increased from 0.5 - less sensitive to background noise
          prefix_padding_ms: 300,
          silence_duration_ms: 1200, // Increased from 500ms to 1.2s - gives user more time to think/speak
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
        // Use custom greeting if set, otherwise use default
        const greeting = this.customGreeting 
          ? this.customGreeting
          : this.projectName 
            ? `Thanks for calling ${this.projectName}. How may I assist you?`
            : 'Thanks for calling! How may I assist you?'
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'response.create',
            response: {
              modalities: ['audio', 'text'],
              instructions: `Greet the caller with: "${greeting}" Say this exactly as written.`,
            }
          }))
          console.log('[RealtimeAgent] Initial greeting triggered:', greeting.substring(0, 50) + '...')
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
        // Function call received - execute immediately
        // OpenAI sends this when function call arguments are complete
        const functionCall = event.function_call
        const callId = event.call_id || event.item_id
        
        if (functionCall && callId) {
          console.log(`[RealtimeAgent] Function call detected: ${functionCall.name} (call_id: ${callId})`)
          
          // Day 5: Track function call metrics
          this.metrics.functionCallsCount++
          
          // Execute function immediately
          this.handleFunctionCall(callId, functionCall.name, functionCall.arguments)
        }
        break

      case 'response.done':
        // Response complete
        console.log('[RealtimeAgent] ✅ Response done:', event.response?.status)
        
        // Debug: Log if response had function calls and extract them manually
        const output = event.response?.output || []
        const functionCallItems = output.filter((item: any) => item.type === 'function_call')
        
        if (functionCallItems.length > 0) {
          console.log('[RealtimeAgent] Response included function call(s)')
          console.log('[RealtimeAgent] ⚠️  MANUAL EXTRACTION - Function calls found in response.done:')
          
          // WORKAROUND: Since response.function_call_arguments.done isn't firing,
          // extract function calls manually from response.done
          for (const item of functionCallItems) {
            console.log('[RealtimeAgent] 🔧 Manually extracted function call:', {
              name: item.name,
              call_id: item.call_id,
              arguments: item.arguments
            })
            
            // Execute the function call
            if (item.name && item.call_id) {
              console.log(`[RealtimeAgent] 🚀 Executing extracted function: ${item.name}`)
              this.metrics.functionCallsCount++
              this.handleFunctionCall(item.call_id, item.name, item.arguments)
            }
          }
        } else {
          console.log('[RealtimeAgent] Response had NO function calls')
        }
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

      // Format result - ensure it's a JSON string for OpenAI Realtime
      let resultString: string
      if (typeof result === 'string') {
        resultString = result
      } else if (result && typeof result === 'object') {
        // If result already has structured format (success, available_times, message), use it as-is
        resultString = JSON.stringify(result)
      } else {
        resultString = JSON.stringify({ result: result || 'Function executed successfully' })
      }

      // Send function result back to OpenAI
      // CRITICAL: Must use conversation.item.create with function_call_output type
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Step 1: Add function output to conversation
        const outputItem = {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: itemId, // Must match the function call's call_id
            output: resultString,
          },
        }
        this.ws.send(JSON.stringify(outputItem))
        console.log(`[RealtimeAgent] Function output sent for ${functionName} (call_id: ${itemId})`)
        console.log(`[RealtimeAgent] Output: ${resultString.substring(0, 200)}...`)

        // Step 2: Create response to continue the conversation
        const createResponse = {
          type: 'response.create',
        }
        this.ws.send(JSON.stringify(createResponse))
        console.log(`[RealtimeAgent] Response.create sent to continue conversation`)
      } else {
        console.error(`[RealtimeAgent] Cannot send function result - WebSocket not open (call_id: ${itemId})`)
      }
    } catch (error: any) {
      console.error(`[RealtimeAgent] Error handling function call ${functionName}:`, error)
      
      // Send error back to OpenAI using correct format
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const errorOutput = {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: itemId,
            output: JSON.stringify({ error: error.message }),
          },
        }
        this.ws.send(JSON.stringify(errorOutput))
        
        // Continue conversation after error
        const createResponse = {
          type: 'response.create',
        }
        this.ws.send(JSON.stringify(createResponse))
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
  private buildSystemPrompt(projectName: string, trade: string, phoneNumber: string | null = null, aiSettings: any = {}): string {
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

**CONVERSATION FLOW - SIMPLIFIED FOR SPEED:**
1. **START WITH GREETING** ${aiSettings.customGreeting ? `- SAY EXACTLY: "${aiSettings.customGreeting}"` : `- "Thanks for calling ${projectName}. How may I assist you?"`}

2. **Listen & Triage** - Let customer explain. Classify as EMERGENCY or ROUTINE:
   - EMERGENCY = "no heat", "burst pipe", "sparks", "flooding", "no power", "sewage backup"
   - ROUTINE = everything else

3. **Fast Path to Booking** - THE MOMENT you have name, phone, and address:
   - Ask: "What's your name and phone?" → Get both
   - Ask: "What's your address?" → Get it
   - **THE INSTANT they give address, IMMEDIATELY say "Let me check availability" and call get_slots**
   - Use date parameter: ${new Date().toISOString().split('T')[0]} (TODAY)
   - Use time_of_day: "any"
   - When get_slots returns, read the available_times array
   - Say: "I have [time1], [time2], or [time3]. Which works?"
   - They pick → IMMEDIATELY call book_slot with ALL info
   - Say: "Done! See you at [time]."
   
**CRITICAL - NEVER GO SILENT:**
- After EVERY question, WAIT for answer, then IMMEDIATELY take next action
- After getting address: IMMEDIATELY call get_slots (don't pause, don't think, just call it)
- After presenting times: WAIT for customer choice, then IMMEDIATELY call book_slot
- If you're not speaking, you should be calling a function
- NEVER pause without speaking or calling a function

**DATE LOGIC - CRITICAL:**
- Current time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour12: true })} (Eastern Time)
- **EMERGENCY**: Always use TODAY's date
- **ROUTINE before 8 PM**: Use TODAY's date (gives same-day service)
- **ROUTINE after 8 PM**: Use TOMORROW's date (next business day)
- **NEVER use "tomorrow" when today has availability unless it's after 8 PM**

**BOOKING RULES:**
- Get name + phone in ONE question: "What's your name and phone number?"
- Get address after: "What's your address?"
- Call get_slots IMMEDIATELY after getting address - don't wait
- Present 2-3 time options from the slots
- When they pick a time, call book_slot IMMEDIATELY
- Keep responses under 15 words
- No credit card - we bill after service
- No long confirmations - just "[time], got it. See you then!"

**EMERGENCY PRIORITY:**
If customer says: "no heat", "furnace down", "burst pipe", "flooding", "sparks", "no power" → 
Say: "That's urgent. I'll get someone out today. Name and phone?" → Get info → Book SAME DAY

${aiSettings.customClosing ? `\n**CLOSING:** ${aiSettings.customClosing}` : ''}`
  }

  private async buildTools(project: any): Promise<any[]> {
    // Build tools similar to Vapi implementation
    // Week 2: Enhanced with knowledge base and emergency-aware booking
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return [
      {
        name: 'get_slots',
        description: 'Get available booking time slots. Use date (YYYY-MM-DD) and time_of_day (morning/afternoon/evening/any) to find slots. Returns available times in structured format.',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date in YYYY-MM-DD format (local timezone). For routine calls, use tomorrow or later. For emergencies, use today.' },
            time_of_day: { type: 'string', enum: ['morning', 'afternoon', 'evening', 'any'], description: 'Preferred time of day. Morning = before 12pm, Afternoon = 12pm-5pm, Evening = after 5pm, Any = no preference' },
            duration_min: { type: 'number', description: 'Duration in minutes (default: 60)' },
            isEmergency: { type: 'boolean', description: 'Set true for emergency calls to prioritize same-day availability' },
          },
          required: ['date', 'time_of_day'],
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
      // TEMPORARILY DISABLED - check_service_area causes AI to go silent
      // Will re-enable after fixing the flow
      // {
      //   name: 'check_service_area',
      //   description: 'Check if a service address is within the configured service area. Use this before booking to verify coverage.',
      //   parameters: {
      //     type: 'object',
      //     properties: {
      //       address: { type: 'string', description: 'Service address to check' },
      //     },
      //     required: ['address'],
      //   },
      // },
    ]
  }
}
