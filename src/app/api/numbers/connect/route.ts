import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTwilioClient } from '@/lib/sms'
import { z } from 'zod'

const ConnectNumberSchema = z.object({
  projectId: z.string(),
  agentId: z.string(),
  existingPhoneNumber: z.string(), // E.164 format: +1234567890 - customer's existing business number
})

/**
 * POST /api/numbers/connect
 * Connect an existing business phone number via call forwarding
 * 
 * Strategy: Customer keeps their existing number with current carrier,
 * forwards calls to a Twilio number that's configured with the AI assistant.
 * 
 * This is much simpler than porting - no carrier coordination needed!
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = ConnectNumberSchema.parse(body)

    // Validate phone number format (E.164)
    const e164Regex = /^\+[1-9]\d{1,14}$/
    if (!e164Regex.test(input.existingPhoneNumber)) {
      return NextResponse.json({ 
        error: 'Invalid phone number format. Please use E.164 format (e.g., +1234567890)' 
      }, { status: 400 })
    }

    const agent = await prisma.agent.findUnique({
      where: { id: input.agentId },
    })

    if (!agent || agent.projectId !== input.projectId) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: { owner: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const twilioClient = getTwilioClient()
    if (!twilioClient) {
      return NextResponse.json({ 
        error: 'Twilio credentials not configured. Please contact support.' 
      }, { status: 500 })
    }

    // Get OpenAI Realtime server URL
    const openaiRealtimeServerUrl = process.env.OPENAI_REALTIME_SERVER_URL || 
      process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, 'https://') || 
      'http://localhost:8080'
    const voiceUrl = `${openaiRealtimeServerUrl}/twilio/voice`
    const statusCallbackUrl = `${openaiRealtimeServerUrl}/twilio/status`

    // Strategy: Purchase a new Twilio number for the AI assistant,
    // then provide forwarding instructions for the customer's existing number
    
    // Check if project already has a Twilio number for forwarding
    const existingForwardingNumber = await prisma.phoneNumber.findFirst({
      where: {
        projectId: input.projectId,
        systemType: 'openai-realtime',
      },
    })

    let twilioNumber = existingForwardingNumber
    let twilioSid: string | null = null

    if (!existingForwardingNumber) {
      // Purchase a new Twilio number for forwarding
      console.log(`[Connect Number] Purchasing new Twilio number for call forwarding`)
      
      // Extract area code from existing number for consistency
      const areaCode = input.existingPhoneNumber.replace(/\D/g, '').substring(1, 4)
      
      try {
        const { searchAvailableNumbers, purchaseTwilioNumber } = await import('@/lib/sms')
        const availableNumbers = await searchAvailableNumbers(areaCode || '205')
        
        if (availableNumbers.length === 0) {
          return NextResponse.json({ 
            error: `No numbers available in area code ${areaCode || '205'}. Please try a different area code or contact support.` 
          }, { status: 404 })
        }

        const numberToPurchase = availableNumbers[0].phoneNumber
        twilioSid = await purchaseTwilioNumber(numberToPurchase)
        
        console.log(`[Connect Number] Purchased Twilio number: ${numberToPurchase} (SID: ${twilioSid})`)

        // Get app URL for SMS webhook (use Next.js app URL, not server URL)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
        const smsWebhookUrl = `${appUrl}/api/twilio/sms-webhook`

        // Configure the new Twilio number
        await twilioClient.incomingPhoneNumbers(twilioSid).update({
          voiceUrl: voiceUrl,
          voiceMethod: 'POST',
          statusCallback: statusCallbackUrl,
          statusCallbackMethod: 'POST',
          smsUrl: smsWebhookUrl,
          smsMethod: 'POST',
        })

                        // Use safe assignment for the forwarding number
                const { safeAssignPhoneNumber } = await import('@/lib/phone-number-utils')
                const assignment = await safeAssignPhoneNumber(numberToPurchase, input.projectId, {
                  vapiNumberId: twilioSid,
                  label: 'AI Assistant (Forwarding)',
                  serverUrl: voiceUrl,
                  systemType: 'openai-realtime',
                })
                twilioNumber = assignment.phoneNumber

                if (!twilioNumber) {
                  throw new Error('Failed to assign forwarding number')
                }

        await prisma.eventLog.create({
          data: {
            projectId: input.projectId,
            type: 'number.purchased',
            payload: { 
              numberId: twilioNumber.id, 
              e164: numberToPurchase,
              purpose: 'call_forwarding',
            },
          },
        })
      } catch (error: any) {
        console.error('[Connect Number] Error purchasing Twilio number:', error)
        return NextResponse.json({ 
          error: `Failed to purchase forwarding number: ${error.message}` 
        }, { status: 500 })
      }
    } else {
      twilioSid = existingForwardingNumber.vapiNumberId || null
      console.log(`[Connect Number] Using existing forwarding number: ${existingForwardingNumber.e164}`)
    }

    // Create or update record for the customer's existing number (for display/reference)
    // This number won't be in Twilio, it's just for tracking
    const existingNumberRecord = await prisma.phoneNumber.findUnique({
      where: { e164: input.existingPhoneNumber },
    })

    if (!existingNumberRecord || existingNumberRecord.projectId !== input.projectId) {
      // Store the existing number for reference (with a flag that it's forwarded)
      await prisma.phoneNumber.create({
        data: {
          projectId: input.projectId,
          e164: input.existingPhoneNumber,
          label: 'Business Number (Forwarded)',
          systemType: 'openai-realtime',
          vapiNumberId: `forwarded-${Date.now()}`, // Not a real Twilio SID
          serverUrl: null, // Not directly configured
        },
      })
    }

    await prisma.eventLog.create({
      data: {
        projectId: input.projectId,
        type: 'number.forwarding_setup',
        payload: { 
          existingNumber: input.existingPhoneNumber,
          forwardingTo: twilioNumber?.e164,
        },
      },
    })

    return NextResponse.json({
      success: true,
      forwardingNumber: twilioNumber,
      existingNumber: input.existingPhoneNumber,
      forwardingInstructions: {
        message: 'Your call forwarding is set up! Forward calls from your existing number to the AI assistant number.',
        existingNumber: input.existingPhoneNumber,
        forwardingTo: twilioNumber?.e164,
        nextSteps: [
          `Log into your current phone carrier's account (where ${input.existingPhoneNumber} is located)`,
          `Set up call forwarding to: ${twilioNumber?.e164}`,
          `Configure forwarding rules (e.g., forward all calls, or forward after hours only)`,
          `Once configured, calls to your business number will be answered by your AI assistant!`,
        ],
        note: 'Keep your existing carrier - you only need to forward calls. No porting required!',
      },
    })
  } catch (error: any) {
    console.error('Connect number error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors,
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to connect number' 
    }, { status: 500 })
  }
}
