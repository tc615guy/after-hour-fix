import express from 'express'
import { CallSessionManager } from '../session-manager.js'
import { prisma } from '../db.js'
import twilio from 'twilio'

export function setupTwilioRoutes(app: express.Application, sessionManager: CallSessionManager) {
  // TwiML endpoint for incoming calls
  app.post('/twilio/voice', async (req, res) => {
    const { CallSid, From, To } = req.body

    console.log(`[Twilio] Incoming call: ${CallSid} from ${From} to ${To}`)

    // Look up agent/project by phone number (To)
    try {
      const phoneNumber = await prisma.phoneNumber.findUnique({
        where: { e164: To },
        include: {
          project: {
            include: {
              agents: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' },
                take: 1, // Get the latest agent
              },
            },
          },
        },
      })

      if (!phoneNumber) {
        console.error(`[Twilio] Phone number not found: ${To}`)
        res.type('text/xml')
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, this number is not configured.</Say>
  <Hangup/>
</Response>`)
        return
      }

      const project = phoneNumber.project
      const agent = project.agents[0]

      if (!agent) {
        console.error(`[Twilio] No agent found for project: ${project.id}`)
        res.type('text/xml')
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, no agent is configured for this number.</Say>
  <Hangup/>
</Response>`)
        return
      }

      // Day 25: Dual-mode support - only handle OpenAI Realtime calls
      const agentSystemType = agent.systemType || 'vapi'
      const phoneSystemType = phoneNumber.systemType || 'vapi'

      if (agentSystemType !== 'openai-realtime' || phoneSystemType !== 'openai-realtime') {
        console.log(`[Twilio] Call routed to Vapi system. Agent: ${agentSystemType}, Phone: ${phoneSystemType}`)
        // This call should be handled by Vapi, not OpenAI Realtime
        // Return TwiML that forwards to Vapi or rejects the call
        // In practice, Vapi numbers are configured differently, so this shouldn't happen
        // But we'll log and reject for safety
        res.type('text/xml')
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>This number is configured for a different system. Please contact support.</Say>
  <Hangup/>
</Response>`)
        return
      }

      console.log(`[Twilio] Found project: ${project.name}, agent: ${agent.name} (OpenAI Realtime)`)

      // Create session with real agent/project IDs
      await sessionManager.createSession(CallSid, agent.id, project.id, From, To)

      // Initialize OpenAI Realtime agent BEFORE starting media stream
      // This ensures the WebSocket is connected when audio starts flowing
      console.log(`[Twilio] Pre-initializing Realtime agent for call ${CallSid}`)
      await sessionManager.initializeRealtimeAgent(CallSid)
      console.log(`[Twilio] Realtime agent ready for call ${CallSid}`)

      // Return TwiML to start BIDIRECTIONAL media stream
      // Use <Connect><Stream> for TRUE bidirectional audio
      // This is the ONLY way to send audio back to the caller
      const mediaStreamUrl = process.env.MEDIA_STREAM_URL || `ws://localhost:${process.env.PORT || 8080}/twilio/stream`
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${mediaStreamUrl}" />
  </Connect>
</Response>`

      res.type('text/xml')
      res.send(twiml)
    } catch (error: any) {
      console.error(`[Twilio] Error handling incoming call:`, error)
      res.type('text/xml')
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, there was an error processing your call.</Say>
  <Hangup/>
</Response>`)
    }
  })

  // Status callback endpoint
  app.post('/twilio/status', async (req, res) => {
    const { CallSid, CallStatus, From, To } = req.body
    console.log(`[Twilio] Call status update: ${CallSid} -> ${CallStatus}`)

    // Day 9: Handle missed calls with SMS auto-response
    if (CallStatus === 'no-answer' || CallStatus === 'busy') {
      console.log(`[Twilio] Missed call detected: ${CallSid} from ${From}`)
      
      try {
        // Look up project by phone number
        const phoneNumber = await prisma.phoneNumber.findUnique({
          where: { e164: To },
          include: { project: true },
        })

        if (phoneNumber?.project) {
          // Update Call record to 'missed'
          await prisma.call.updateMany({
            where: { vapiCallId: CallSid },
            data: { status: 'missed' },
          })

          // Send missed call SMS (Day 9)
          await sendMissedCallSMS(phoneNumber.project, From, To)
        }
      } catch (error: any) {
        console.error(`[Twilio] Error handling missed call:`, error)
      }

      // End session if it exists
      await sessionManager.endSession(CallSid, 'missed').catch(console.error)
    } else if (CallStatus === 'completed') {
      await sessionManager.endSession(CallSid, 'completed').catch(console.error)
    } else if (CallStatus === 'failed') {
      await sessionManager.endSession(CallSid, 'failed').catch(console.error)
    }

    res.status(200).send('OK')
  })
}

// Day 9: SMS Auto-Response to Missed Calls
async function sendMissedCallSMS(project: any, fromNumber: string, toNumber: string): Promise<void> {
  try {
    // Skip if Twilio SMS not configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !twilioPhone) {
      console.warn('[Missed Call SMS] Twilio not configured, skipping SMS')
      return
    }

    const twilioClient = twilio(accountSid, authToken)

    // Build booking URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
    const bookingUrl = `${appUrl}/book?project=${project.id}`

    // Build SMS message
    const message = `Hi! Sorry we missed your call to ${project.name}. 

📅 Book online: ${bookingUrl}

Or call back anytime - we're available 24/7!

- ${project.name}`

    // Clean phone number
    let cleanPhone = fromNumber.replace(/\D/g, '')
    if (cleanPhone.length === 10) {
      cleanPhone = `+1${cleanPhone}`
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      cleanPhone = `+${cleanPhone}`
    } else if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+${cleanPhone}`
    }

    // Send SMS
    await twilioClient.messages.create({
      body: message,
      from: twilioPhone,
      to: cleanPhone,
    })

    console.log(`[Missed Call SMS] Sent to ${cleanPhone} for project ${project.name}`)

    // Log event
    await prisma.eventLog.create({
      data: {
        projectId: project.id,
        type: 'missed_call.sms_sent',
        payload: {
          callFrom: fromNumber,
          callTo: toNumber,
          message: message.substring(0, 100), // Truncate for storage
        },
      },
    })
  } catch (error: any) {
    console.error('[Missed Call SMS] Error sending SMS:', error)
  }
}
