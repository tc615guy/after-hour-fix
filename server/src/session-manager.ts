import { WebSocketServer, WebSocket } from 'ws'
import { RealtimeAgent } from './realtime-agent.js'
import { AudioConverter } from './audio-converter.js'
import { prisma } from './db.js'

export interface CallSession {
  callSid: string
  agentId: string
  projectId: string
  realtimeAgent: RealtimeAgent | null
  twilioWs: WebSocket | null
  twilioStreamSid?: string // Store the stream SID from Twilio
  audioConverter: AudioConverter | null // Audio format converter
  startTime: Date
  state: 'connecting' | 'active' | 'ending' | 'ended'
  callRecordId?: string // Day 8: Store database Call record ID
  fromNumber?: string // Day 8: Store caller phone number
  toNumber?: string // Day 8: Store called phone number
}

export class CallSessionManager {
  private sessions = new Map<string, CallSession>()
  private wss: WebSocketServer

  constructor(wss: WebSocketServer) {
    this.wss = wss
  }

  async createSession(callSid: string, agentId: string, projectId: string, fromNumber?: string, toNumber?: string): Promise<CallSession> {
    console.log(`[SessionManager] Creating session for call ${callSid}, agent ${agentId}`)

    // Initialize audio converter for this session
    const audioConverter = new AudioConverter()
    await audioConverter.waitUntilReady()
    console.log(`[SessionManager] Audio converter ready for call ${callSid}`)

    // Day 8: Create Call record in database
    let callRecordId: string | undefined
    try {
      const callRecord = await prisma.call.create({
        data: {
          projectId,
          agentId,
          vapiCallId: callSid, // Use Twilio CallSid as identifier
          direction: 'inbound',
          fromNumber: fromNumber || 'unknown',
          toNumber: toNumber || 'unknown',
          status: 'active', // Will update to 'completed' or 'missed' later
        },
      })
      callRecordId = callRecord.id
      console.log(`[SessionManager] Created Call record: ${callRecordId}`)
    } catch (error: any) {
      console.error(`[SessionManager] Failed to create Call record:`, error)
      // Continue even if Call record creation fails
    }

    const session: CallSession = {
      callSid,
      agentId,
      projectId,
      realtimeAgent: null,
      twilioWs: null,
      audioConverter,
      startTime: new Date(),
      state: 'connecting',
      callRecordId,
      fromNumber,
      toNumber,
    }

    this.sessions.set(callSid, session)
    return session
  }

  getSession(callSid: string): CallSession | undefined {
    return this.sessions.get(callSid)
  }

  async initializeRealtimeAgent(callSid: string): Promise<void> {
    const session = this.sessions.get(callSid)
    if (!session) {
      throw new Error(`Session not found for call ${callSid}`)
    }

    console.log(`[SessionManager] Initializing Realtime agent for call ${callSid}`)

    const agent = new RealtimeAgent(session.projectId, session.agentId)
    await agent.connect()

    session.realtimeAgent = agent
    session.state = 'active'

    // Audio forwarding from Twilio → OpenAI is handled in media-streams.ts
    // We don't need to set up the listener here since media-streams.ts handles it

    // Forward audio from OpenAI → Twilio
    agent.onAudio((audioChunk: Buffer) => {
      if (session.twilioWs && session.twilioWs.readyState === WebSocket.OPEN && session.twilioStreamSid) {
        try {
          // OpenAI now sends g711_ulaw directly (8kHz μ-law) - NO CONVERSION NEEDED!
          // This eliminates audio quality loss from resampling
          
          // Twilio Media Streams response format:
          // { event: 'media', streamSid: '...', media: { payload: '<base64>' } }
          const mediaMessage = {
            event: 'media',
            streamSid: session.twilioStreamSid,
            media: {
              payload: audioChunk.toString('base64'), // OpenAI audio is already μ-law, just encode to base64
            },
          }
          
          session.twilioWs.send(JSON.stringify(mediaMessage))
        } catch (error: any) {
          console.error(`[SessionManager] Error sending audio for call ${callSid}:`, error)
        }
      }
    })

    // Handle function calls (Week 2, Day 6 - Full implementation)
    agent.onFunctionCall(async (functionName: string, args: any) => {
      console.log(`[SessionManager] Function call: ${functionName}`, args)
      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      
      try {
        // Parse arguments if they're a string
        const params = typeof args === 'string' ? JSON.parse(args) : args
        
        // Week 3, Day 16: Retry logic with exponential backoff
        const maxRetries = 3
        let lastError: Error | null = null
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            let result: any
            
            switch (functionName) {
              case 'get_slots': {
                // Handle emergency-aware slot fetching
                const start = params.isEmergency 
                  ? new Date().toISOString() // Emergency: start from now
                  : (params.start || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()) // Routine: default to tomorrow
                const end = params.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                
                const url = `${appUrl}/api/calcom/availability?projectId=${session.projectId}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
                console.log(`[SessionManager] Calling get_slots: ${url} (emergency: ${params.isEmergency || false}) [attempt ${attempt}/${maxRetries}]`)
                
                const res = await fetch(url, {
                  signal: AbortSignal.timeout(10000), // 10 second timeout
                })
                
                if (!res.ok) {
                  throw new Error(`HTTP ${res.status}: ${res.statusText}`)
                }
                
                const data = await res.json() as { result?: string; message?: string }
                result = { result: data.result || data.message || 'Available slots retrieved' }
                break
              }
              
              case 'book_slot': {
                const url = `${appUrl}/api/book?projectId=${session.projectId}`
                console.log(`[SessionManager] Calling book_slot: ${url} [attempt ${attempt}/${maxRetries}]`, params)
                
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(params),
                  signal: AbortSignal.timeout(15000), // 15 second timeout for booking
                })
                
                if (!res.ok) {
                  const errorData = await res.json().catch(() => ({})) as { error?: string }
                  throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`)
                }
                
                const data = await res.json() as { result?: string; message?: string }
                result = { result: data.result || data.message || 'Booking created successfully' }
                break
              }
              
              case 'get_pricing': {
                const url = `${appUrl}/api/pricing/assistant?projectId=${session.projectId}`
                console.log(`[SessionManager] Calling get_pricing: ${url} [attempt ${attempt}/${maxRetries}]`)
                
                const res = await fetch(url, {
                  signal: AbortSignal.timeout(10000),
                })
                
                if (!res.ok) {
                  throw new Error(`HTTP ${res.status}: ${res.statusText}`)
                }
                
                const data = await res.json() as { result?: string; message?: string }
                result = { result: data.result || data.message || 'Pricing retrieved' }
                break
              }
              
              case 'get_knowledge': {
                const url = `${appUrl}/api/knowledge?projectId=${session.projectId}`
                console.log(`[SessionManager] Calling get_knowledge: ${url} [attempt ${attempt}/${maxRetries}]`)
                
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ projectId: session.projectId }),
                  signal: AbortSignal.timeout(10000),
                })
                
                if (!res.ok) {
                  throw new Error(`HTTP ${res.status}: ${res.statusText}`)
                }
                
                const data = await res.json() as { result?: string; knowledge?: string; message?: string }
                result = { result: data.result || data.knowledge || data.message || 'Knowledge retrieved' }
                break
              }
              
              case 'check_service_area': {
                if (!params.address) {
                  return { result: 'Address required to check service area' }
                }
                
                const url = `${appUrl}/api/service-area/check?projectId=${session.projectId}&address=${encodeURIComponent(params.address)}`
                console.log(`[SessionManager] Calling check_service_area: ${url} [attempt ${attempt}/${maxRetries}]`)
                
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ address: params.address }),
                  signal: AbortSignal.timeout(10000),
                })
                
                if (!res.ok) {
                  throw new Error(`HTTP ${res.status}: ${res.statusText}`)
                }
                
                const data = await res.json() as { result?: string; message?: string }
                result = { result: data.result || data.message || 'Service area checked' }
                break
              }
              
              default:
                console.warn(`[SessionManager] Unknown function: ${functionName}`)
                return { result: `Unknown function: ${functionName}` }
            }
            
            // Success! Return result (break out of retry loop)
            if (attempt > 1) {
              console.log(`[SessionManager] Function ${functionName} succeeded on attempt ${attempt}`)
            }
            return result
            
          } catch (error: any) {
            lastError = error
            const isRetryable = 
              error.name === 'AbortError' || // Timeout
              error.message?.includes('ECONNREFUSED') || // Connection refused
              error.message?.includes('ETIMEDOUT') || // Network timeout
              error.message?.includes('HTTP 5') || // 5xx server errors
              error.message?.includes('HTTP 429') // Rate limiting
            
            if (attempt < maxRetries && isRetryable) {
              // Exponential backoff: 500ms, 1s, 2s
              const delay = 500 * Math.pow(2, attempt - 1)
              console.warn(`[SessionManager] Function ${functionName} failed (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${delay}ms...`)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue // Retry
            } else {
              // Not retryable or max retries reached
              throw error
            }
          }
        }
        
        // Should never reach here, but TypeScript needs it
        throw lastError || new Error('Function call failed after retries')
        
      } catch (error: any) {
        // Week 3, Day 16: Enhanced error logging
        const errorMessage = error.message || 'Function execution failed'
        const errorDetails = {
          functionName,
          callSid: session.callSid,
          projectId: session.projectId,
          error: errorMessage,
          args: typeof args === 'string' ? args.substring(0, 200) : JSON.stringify(args).substring(0, 200),
          timestamp: new Date().toISOString(),
        }
        
        console.error(`[SessionManager] Error executing ${functionName} after retries:`, errorDetails)
        
        // Log to EventLog for monitoring
        try {
          await prisma.eventLog.create({
            data: {
              projectId: session.projectId,
              type: 'function_call.error',
              payload: errorDetails,
            },
          })
          
          // Week 4, Day 20: Send alert for function call errors
          try {
            const { sendAlert, Alerts, getAlertConfig } = await import('./monitoring/alerts.js')
            await sendAlert(
              Alerts.functionCallFailure(functionName, errorMessage, session.projectId, session.callSid),
              getAlertConfig()
            )
          } catch (alertError: any) {
            console.error(`[SessionManager] Failed to send alert:`, alertError)
          }
        } catch (logError: any) {
          console.error(`[SessionManager] Failed to log error to EventLog:`, logError)
        }
        
        // Return user-friendly error message
        return { 
          result: `I'm having trouble connecting to our booking system right now. Please try again in a moment, or you can book online at ${appUrl}/book?project=${session.projectId}` 
        }
      }
    })
  }

  setTwilioWebSocket(callSid: string, ws: WebSocket): void {
    const session = this.sessions.get(callSid)
    if (!session) {
      throw new Error(`Session not found for call ${callSid}`)
    }

    session.twilioWs = ws

    // Audio forwarding is handled in media-streams.ts, not here
    // This method just stores the WebSocket reference
  }

  async endSession(callSid: string, finalStatus: 'completed' | 'missed' | 'failed' = 'completed'): Promise<void> {
    const session = this.sessions.get(callSid)
    if (!session) {
      return
    }

    console.log(`[SessionManager] Ending session for call ${callSid}, status: ${finalStatus}`)
    session.state = 'ending'

    // Day 8: Collect transcript and update Call record
    let transcript: string | undefined
    let durationSec: number | undefined

    if (session.realtimeAgent) {
      const metrics = session.realtimeAgent.getMetrics()
      const sessionDuration = Date.now() - session.startTime.getTime()
      durationSec = Math.round(sessionDuration / 1000)

      // Get transcript
      transcript = session.realtimeAgent.getTranscript()

      // Log performance metrics
      console.log(`[SessionManager] Call ${callSid} metrics:`, {
        duration: `${durationSec}s`,
        uptime: `${Math.round(metrics.uptime / 1000)}s`,
        audioChunksSent: metrics.audioChunksSent,
        audioChunksReceived: metrics.audioChunksReceived,
        audioBytesSent: metrics.audioBytesSent,
        audioBytesReceived: metrics.audioBytesReceived,
        functionCalls: metrics.functionCallsCount,
        averageLatency: metrics.averageLatency ? `${metrics.averageLatency}ms` : 'N/A',
        transcriptLength: transcript.length,
      })

      // Disconnect OpenAI Realtime agent
      await session.realtimeAgent.disconnect()
    } else {
      const sessionDuration = Date.now() - session.startTime.getTime()
      durationSec = Math.round(sessionDuration / 1000)
    }

    // Day 8: Update Call record with transcript and final status
    if (session.callRecordId) {
      try {
        await prisma.call.update({
          where: { id: session.callRecordId },
          data: {
            status: finalStatus,
            transcript: transcript || null,
            durationSec: durationSec || null,
            // Note: recordingUrl would be set if we implement audio recording (future enhancement)
          },
        })
        console.log(`[SessionManager] Updated Call record ${session.callRecordId} with transcript and status`)
      } catch (error: any) {
        console.error(`[SessionManager] Failed to update Call record:`, error)
      }
    }

    // Close Twilio WebSocket
    if (session.twilioWs) {
      session.twilioWs.close()
    }

    session.state = 'ended'
    this.sessions.delete(callSid)
  }

  shutdown(): void {
    console.log('[SessionManager] Shutting down all sessions...')
    for (const [callSid] of this.sessions) {
      this.endSession(callSid).catch(console.error)
    }
  }

  getActiveSessionsCount(): number {
    return this.sessions.size
  }
}
