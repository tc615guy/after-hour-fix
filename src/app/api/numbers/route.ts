import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { searchAvailableNumbers, purchaseTwilioNumber, getTwilioClient } from '@/lib/sms'
import { z } from 'zod'

const PurchaseNumberSchema = z.object({
  projectId: z.string(),
  agentId: z.string(),
  areaCode: z.string().optional(),
  number: z.string().optional(), // If specific number is chosen
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const areaCode = searchParams.get('areaCode') || undefined

    // Search via Twilio instead of Vapi
    const numbers = await searchAvailableNumbers(areaCode || '205')

    return NextResponse.json({ numbers })
  } catch (error: any) {
    console.error('Search numbers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Purchase number request body:', body)
    const input = PurchaseNumberSchema.parse(body)

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

    // TODO: Re-enable subscription check after testing
    // For now, allow phone number purchase without subscription for onboarding/testing
    // const subscription = await prisma.subscription.findFirst({
    //   where: { userId: project?.ownerId, status: { in: ['active', 'trialing'] } },
    // })
    // if (!subscription) {
    //   return NextResponse.json({ 
    //     error: 'Active subscription required. Please subscribe to a plan first.',
    //     requiresSubscription: true
    //   }, { status: 402 })
    // }

    let numberToPurchase = input.number
    if (!numberToPurchase) {
      // Auto-purchase: Search for and buy first available number
      const availableNumbers = await searchAvailableNumbers(input.areaCode || '205')
      if (availableNumbers.length === 0) {
        return NextResponse.json({ 
          error: `No numbers available in area code ${input.areaCode || '205'}. Try a different area code.` 
        }, { status: 404 })
      }
      numberToPurchase = availableNumbers[0].phoneNumber
    }

    // Step 1: Purchase from Twilio
    console.log(`[B2B Provision] Purchasing number from Twilio: ${numberToPurchase}`)
    const twilioSid = await purchaseTwilioNumber(numberToPurchase)
    console.log(`[B2B Provision] Twilio purchase complete: ${twilioSid}`)

    // Step 2: Configure Twilio number for OpenAI Realtime server
    const twilioClient = getTwilioClient()
    if (!twilioClient) {
      throw new Error('Twilio credentials not configured')
    }

    // Get OpenAI Realtime server URL from environment
    const openaiRealtimeServerUrl = process.env.OPENAI_REALTIME_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, 'https://') || 'http://localhost:8080'
    const voiceUrl = `${openaiRealtimeServerUrl}/twilio/voice`
    const statusCallbackUrl = `${openaiRealtimeServerUrl}/twilio/status`
    
    // Get app URL for SMS webhook (use Next.js app URL, not server URL)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
    const smsWebhookUrl = `${appUrl}/api/twilio/sms-webhook`

    console.log(`[B2B Provision] Configuring Twilio number for OpenAI Realtime server: ${voiceUrl}`)
    console.log(`[B2B Provision] Configuring SMS webhook: ${smsWebhookUrl}`)

    // Update Twilio number to point to OpenAI Realtime server and configure SMS webhook
    await twilioClient.incomingPhoneNumbers(twilioSid).update({
      voiceUrl: voiceUrl,
      voiceMethod: 'POST',
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: 'POST',
      smsUrl: smsWebhookUrl,
      smsMethod: 'POST',
    })

    console.log(`[B2B Provision] Twilio number configured for OpenAI Realtime server`)

    // Use safe assignment to handle conflicts and cleanup orphaned numbers
    const { safeAssignPhoneNumber } = await import('@/lib/phone-number-utils')
    const assignment = await safeAssignPhoneNumber(numberToPurchase, input.projectId, {
      vapiNumberId: twilioSid,
      label: 'Main',
      serverUrl: voiceUrl,
      systemType: 'openai-realtime',
    })

    const phoneNumber = assignment.phoneNumber

    await prisma.eventLog.create({
      data: {
        projectId: input.projectId,
        type: 'number.purchased',
        payload: { numberId: phoneNumber.id, e164: numberToPurchase },
      },
    })

    return NextResponse.json({
      success: true,
      phoneNumber,
    })
  } catch (error: any) {
    console.error('Purchase number error:', error)
    
    // Handle Twilio trial limit error specifically
    if (error.message?.includes('Trial accounts')) {
      return NextResponse.json({ 
        error: 'Your Twilio account is on a trial plan and limited to one number. Please upgrade your Twilio account to purchase additional numbers.',
        requiresTwilioUpgrade: true
      }, { status: 402 })
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
