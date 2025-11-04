import { WebSocketServer, WebSocket } from 'ws'
import { CallSessionManager } from '../session-manager.js'
import { URL } from 'url'

interface TwilioMediaMessage {
  event: 'start' | 'media' | 'stop' | 'connected' | 'mark'
  streamSid?: string
  accountSid?: string
  callSid?: string
  tracks?: string[]
  start?: {
    accountSid: string
    streamSid: string
    callSid: string
    tracks: string[]
    mediaFormat: {
      encoding: string
      sampleRate: number
      channels: number
    }
    customParameters?: Record<string, string>
  }
  media?: {
    track: 'inbound' | 'outbound'
    chunk: string
    timestamp: string
    payload: string // Base64 encoded audio
  }
  mark?: {
    name: string
    timestamp: string
  }
}

export function setupMediaStreamHandler(wss: WebSocketServer, sessionManager: CallSessionManager) {
  wss.on('connection', (ws: WebSocket, req) => {
    let callSid: string | null = null

    console.log(`[MediaStream] New WebSocket connection from ${req.socket.remoteAddress}`)

    // Handle messages from Twilio
    ws.on('message', async (data: Buffer) => {
      try {
        const message: TwilioMediaMessage = JSON.parse(data.toString())

        // Get callSid from the first 'start' event message (Twilio sends callSid in the start object)
        if (message.event === 'start') {
          callSid = message.start?.callSid || null
          
          if (!callSid) {
            console.error('[MediaStream] Missing callSid in start event', message)
            ws.close(1008, 'Missing callSid in start event')
            return
          }

          console.log(`[MediaStream] Stream started for call ${callSid}`, {
            streamSid: message.start?.streamSid,
            accountSid: message.start?.accountSid,
            tracks: message.start?.tracks,
          })

          // Verify session exists
          const session = sessionManager.getSession(callSid)
          if (!session) {
            console.error(`[MediaStream] Session not found for call ${callSid}`)
            ws.close(1008, 'Session not found')
            return
          }

          // Set up Twilio WebSocket
          sessionManager.setTwilioWebSocket(callSid, ws)

          // Store stream SID for sending audio back to Twilio
          if (session && message.start?.streamSid) {
            session.twilioStreamSid = message.start.streamSid
          }
          
          // Realtime agent should already be initialized from the /twilio/voice endpoint
          // If not, initialize it now (fallback for edge cases)
          if (!session.realtimeAgent) {
            console.log(`[MediaStream] Realtime agent not pre-initialized, initializing now for call ${callSid}`)
            await sessionManager.initializeRealtimeAgent(callSid)
          } else {
            console.log(`[MediaStream] Realtime agent already initialized for call ${callSid}`)
          }
        } else if (message.event === 'media') {
          // Audio data from Twilio
          // Need callSid to process audio
          if (!callSid) {
            console.warn('[MediaStream] Received media event before start event')
            return
          }

          const session = sessionManager.getSession(callSid)
          if (!session) {
            console.warn(`[MediaStream] Session not found for call ${callSid} during media event`)
            return
          }

          // Twilio sends audio in base64-encoded μ-law (8kHz)
          const audioPayload = message.media?.payload
          if (audioPayload && message.media?.track === 'inbound') {
            try {
              // Decode base64 audio payload (μ-law 8kHz from Twilio)
              const mulawBuffer = Buffer.from(audioPayload, 'base64')
              
              // NO CONVERSION NEEDED! OpenAI Realtime now accepts g711_ulaw directly
              // Forward audio directly to Realtime agent
              if (session.realtimeAgent) {
                session.realtimeAgent.sendAudio(mulawBuffer)
              } else {
                console.warn(`[MediaStream] Received audio but Realtime agent not initialized yet for call ${callSid}`)
              }
            } catch (error: any) {
              console.error(`[MediaStream] Error processing audio for call ${callSid}:`, error)
            }
          }
        } else if (message.event === 'stop') {
          if (callSid) {
            console.log(`[MediaStream] Stream stopped for call ${callSid}`)
            await sessionManager.endSession(callSid)
          }
        } else if (message.event === 'connected') {
          if (callSid) {
            console.log(`[MediaStream] Stream connected for call ${callSid}`)
          }
        } else if (message.event === 'mark') {
          if (callSid) {
            console.log(`[MediaStream] Mark event for call ${callSid}:`, message.mark?.name)
          }
        }
      } catch (error) {
        console.error(`[MediaStream] Error processing message:`, error)
      }
    })

    ws.on('close', async () => {
      if (callSid) {
        console.log(`[MediaStream] WebSocket closed for call ${callSid}`)
        await sessionManager.endSession(callSid).catch(console.error)
      } else {
        console.log('[MediaStream] WebSocket closed before start event')
      }
    })

    ws.on('error', (error) => {
      console.error(`[MediaStream] WebSocket error for call ${callSid}:`, error)
    })
  })
}
