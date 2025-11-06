import { WebSocketServer, WebSocket } from 'ws'
import { RealtimeAgent } from './realtime-agent.js'
import { prisma } from './db.js'

export interface CallSession {
  callSid: string
  agentId: string
  projectId: string
  realtimeAgent: RealtimeAgent | null
  twilioWs: WebSocket | null
  twilioStreamSid?: string // Store the stream SID from Twilio
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
      console.log(`[SessionManager] ============================================`)
      console.log(`[SessionManager] FUNCTION CALL RECEIVED: ${functionName}`)
      console.log(`[SessionManager] Arguments:`, JSON.stringify(args, null, 2))
      console.log(`[SessionManager] ============================================`)
      
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
                // Handle slot fetching with date and time_of_day preference
                const isEmergency = params.isEmergency === true || params.isEmergency === 'true'
                const date = params.date // YYYY-MM-DD format
                const timeOfDay = params.time_of_day || 'any' // morning/afternoon/evening/any
                const durationMin = params.duration_min || 60
                
                // Convert date to ISO datetime range
                let start: string | undefined
                let end: string | undefined
                
                if (date) {
                  // Convert YYYY-MM-DD to ISO datetime for the day
                  // CRITICAL: Handle timezone correctly to avoid off-by-one day errors
                  const tz = 'America/Chicago' // Default timezone
                  
                  // Parse date in project timezone (YYYY-MM-DD format)
                  // Create a date at midnight in the project timezone
                  const [year, month, day] = date.split('-').map(Number)
                  const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0)
                  
                  // Set start hour based on time of day preference
                  // This helps the API filter, but we also filter again after getting results
                  if (timeOfDay === 'morning') {
                    dayStart.setHours(8, 0, 0, 0) // Start at 8 AM
                  } else if (timeOfDay === 'afternoon') {
                    dayStart.setHours(12, 0, 0, 0) // Start at noon
                  } else if (timeOfDay === 'evening') {
                    dayStart.setHours(17, 0, 0, 0) // Start at 5 PM
                  } else {
                    dayStart.setHours(0, 0, 0, 0) // Start at midnight
                  }
                  
                  // End of day or next day
                  const dayEnd = new Date(dayStart)
                  dayEnd.setDate(dayEnd.getDate() + 1)
                  dayEnd.setHours(0, 0, 0, 0) // Midnight next day
                  
                  start = dayStart.toISOString()
                  end = dayEnd.toISOString()
                } else {
                  // Fallback: use smart defaults (API will handle)
                  start = undefined
                  end = undefined
                }
                
                const urlParams = new URLSearchParams({
                  projectId: session.projectId,
                  ...(start && { start }),
                  ...(end && { end }),
                  ...(isEmergency && { isEmergency: 'true' }),
                  durationMinutes: durationMin.toString(),
                })
                
                const url = `${appUrl}/api/calcom/availability?${urlParams.toString()}`
                console.log(`[SessionManager] Calling get_slots: ${url} (date: ${date}, time_of_day: ${timeOfDay}, emergency: ${isEmergency}) [attempt ${attempt}/${maxRetries}]`)
                
                const res = await fetch(url, {
                  signal: AbortSignal.timeout(10000), // 10 second timeout
                })
                
                if (!res.ok) {
                  throw new Error(`HTTP ${res.status}: ${res.statusText}`)
                }
                
                const data = await res.json() as { 
                  slots?: Array<{ start: string; end: string; capacity: number; candidates: string[] }>
                  result?: string
                  message?: string
                  firstSlot?: string
                  totalSlots?: number
                }
                
                // Format response for OpenAI Realtime - structured format
                if (data.slots && data.slots.length > 0) {
                  // Filter slots by time_of_day preference if specified
                  // CRITICAL: Use project timezone, NOT UTC!
                  const projectTimezone = 'America/Chicago' // TODO: Get from project settings
                  let filteredSlots = data.slots
                  if (timeOfDay !== 'any') {
                    filteredSlots = data.slots.filter(slot => {
                      const slotTime = new Date(slot.start)
                      // Get hour in project timezone (NOT UTC!)
                      const hour = parseInt(slotTime.toLocaleString('en-US', { 
                        hour: 'numeric', 
                        hour12: false, 
                        timeZone: projectTimezone 
                      }))
                      if (timeOfDay === 'morning') return hour < 12
                      if (timeOfDay === 'afternoon') return hour >= 12 && hour < 17
                      if (timeOfDay === 'evening') return hour >= 17
                      return true
                    })
                  }
                  
                  // Return structured format for the model
                  // CRITICAL: Include human-readable times in project timezone for AI to speak to customers
                  const availableTimes = filteredSlots.slice(0, 5).map(slot => {
                    const slotTime = new Date(slot.start)
                    const displayTime = slotTime.toLocaleString('en-US', {
                      timeZone: projectTimezone,
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                    return {
                      start: slot.start, // ISO format for booking
                      end: slot.end,
                      displayTime: displayTime, // Human-readable time in project timezone
                    }
                  })
                  
                  result = {
                    success: true,
                    available_times: availableTimes,
                    message: filteredSlots.length > 0 
                      ? `Found ${filteredSlots.length} ${timeOfDay} option(s) for ${date || 'your preferred date'}. When presenting times to the customer, use the displayTime field which is in ${projectTimezone} timezone.`
                      : `No ${timeOfDay} slots available for ${date || 'that date'}. Would tomorrow morning or the following day ${timeOfDay} work better?`,
                  }
                } else {
                  // No slots available
                  result = {
                    success: false,
                    available_times: [],
                    message: `No ${timeOfDay} slots available for ${date || 'that date'}. Would tomorrow morning or the following day ${timeOfDay} work better?`,
                  }
                }
                
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
              
              case 'lookup_booking': {
                // Look up existing bookings by phone number
                console.log(`[SessionManager] Calling lookup_booking [attempt ${attempt}/${maxRetries}]`, params)
                
                const url = `${appUrl}/api/lookup-booking`
                const lookupParams = {
                  customerPhone: params.customerPhone,
                  projectId: session.projectId,
                }
                
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(lookupParams),
                  signal: AbortSignal.timeout(10000),
                })
                
                if (!res.ok) {
                  const errorData = await res.json().catch(() => ({})) as { error?: string }
                  throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`)
                }
                
                const data = await res.json() as { 
                  success?: boolean
                  found?: boolean
                  message?: string
                  bookings?: Array<{
                    id: string
                    customerName?: string
                    displayTime: string
                    address?: string
                    status: string
                  }>
                }
                
                if (!data.found || !data.bookings || data.bookings.length === 0) {
                  result = { 
                    result: data.message || 'No active appointments found for this phone number.',
                    found: false
                  }
                } else {
                  const booking = data.bookings[0] // Most recent
                  result = {
                    result: `You have an appointment${booking.customerName ? ` for ${booking.customerName}` : ''} on ${booking.displayTime}${booking.address ? ` at ${booking.address}` : ''}.`,
                    found: true,
                    bookings: data.bookings,
                    currentBooking: booking,
                  }
                }
                break
              }
              
              case 'reschedule_booking': {
                // Reschedule using dedicated reschedule endpoint
                console.log(`[SessionManager] Calling reschedule_booking [attempt ${attempt}/${maxRetries}]`, params)
                
                const url = `${appUrl}/api/reschedule-booking`
                const rescheduleParams = {
                  customerPhone: params.customerPhone,
                  projectId: session.projectId,
                  newStartTime: params.newStartTime,
                  reason: params.reason,
                }
                
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(rescheduleParams),
                  signal: AbortSignal.timeout(15000),
                })
                
                if (!res.ok) {
                  const errorData = await res.json().catch(() => ({})) as { error?: string; result?: string }
                  // If booking not found, return friendly message
                  if (res.status === 404 && errorData.result) {
                    result = { result: errorData.result }
                    break
                  }
                  throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`)
                }
                
                const data = await res.json() as { result?: string; success?: boolean; booking?: any }
                result = { 
                  result: data.result || 'Appointment rescheduled successfully',
                  rescheduled: data.success || true,
                  booking: data.booking,
                }
                break
              }
              
              case 'cancel_booking': {
                // Cancel booking by phone number
                console.log(`[SessionManager] Calling cancel_booking [attempt ${attempt}/${maxRetries}]`, params)
                
                const url = `${appUrl}/api/cancel-booking`
                const cancelParams = {
                  customerPhone: params.customerPhone,
                  projectId: session.projectId,
                  reason: params.reason,
                }
                
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(cancelParams),
                  signal: AbortSignal.timeout(10000),
                })
                
                if (!res.ok) {
                  const errorData = await res.json().catch(() => ({})) as { error?: string; result?: string }
                  // If booking not found, return friendly message
                  if (res.status === 404 && errorData.result) {
                    result = { result: errorData.result }
                    break
                  }
                  throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`)
                }
                
                const data = await res.json() as { result?: string; success?: boolean }
                result = { 
                  result: data.result || 'Appointment canceled successfully',
                  canceled: data.success || true
                }
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
                console.log(`[SessionManager] 🔍 Calling check_service_area for address: "${params.address}" [attempt ${attempt}/${maxRetries}]`)
                
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ address: params.address }),
                  signal: AbortSignal.timeout(10000),
                })
                
                if (!res.ok) {
                  throw new Error(`HTTP ${res.status}: ${res.statusText}`)
                }
                
                const data = await res.json() as { result?: string; message?: string; inServiceArea?: boolean; distanceMiles?: number }
                
                // Include inServiceArea flag to make it clear to AI whether to proceed
                const message = data.result || data.message || 'Service area checked'
                result = { 
                  result: message,
                  inServiceArea: data.inServiceArea !== undefined ? data.inServiceArea : true, // Default to true if not specified
                  ...(data.distanceMiles && { distanceMiles: data.distanceMiles })
                }
                
                console.log(`[SessionManager] ✅ Service area check result: ${data.inServiceArea ? 'IN SERVICE AREA' : 'OUTSIDE SERVICE AREA'} - "${message}"`)
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
            console.log(`[SessionManager] ✅ Returning result for ${functionName}:`, JSON.stringify(result).substring(0, 200))
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
        
        // Send customer feedback request (async, non-blocking)
        // Only for completed calls with successful bookings
        if (finalStatus === 'completed') {
          // TODO: Trigger feedback request via webhook/API to main app
          // The main app will handle sending SMS feedback requests
          console.log(`[SessionManager] Call completed with booking - feedback request should be triggered for call ${session.callRecordId}`)
          
          // Optionally: Make API call to main app to trigger feedback
          // fetch(`${process.env.APP_URL}/api/feedback/trigger`, {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ callId: session.callRecordId })
          // }).catch(err => console.error('[SessionManager] Failed to trigger feedback:', err))
        }
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
