import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVapiClient } from '@/lib/vapi'
import { searchAvailableNumbers, purchaseTwilioNumber } from '@/lib/sms'
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

    // Check for active subscription
    const subscription = await prisma.subscription.findFirst({
      where: { userId: project?.ownerId, status: { in: ['active', 'trialing'] } },
    })

    if (!subscription) {
      return NextResponse.json({ 
        error: 'Active subscription required. Please subscribe to a plan first.',
        requiresSubscription: true
      }, { status: 402 })
    }

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

    // Step 2: Add to Vapi (BYO)
    const vapiClient = createVapiClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const serverUrl = `${appUrl}/api/vapi/webhook`
    const serverUrlSecret = process.env.VAPI_WEBHOOK_SECRET

    const vapiNumber = await vapiClient.purchasePhoneNumber(numberToPurchase, agent.vapiAssistantId, {
      serverUrl,
      serverUrlSecret,
      fallbackDestination: project?.forwardingNumber || undefined,
    })
    console.log(`[B2B Provision] Vapi integration complete: ${vapiNumber.id}`)
    console.log(`[B2B Provision] Vapi number response:`, JSON.stringify(vapiNumber, null, 2))
    
    // If assistantId is missing from response, explicitly attach it
    if (!vapiNumber.assistantId) {
      console.log(`[B2B Provision] Assistant ID missing from response, attaching to assistant: ${agent.vapiAssistantId}`)
      await vapiClient.attachNumberToAssistant(vapiNumber.id, agent.vapiAssistantId)
    }

    // Check if number already exists
    const existingNumber = await prisma.phoneNumber.findUnique({
      where: { e164: vapiNumber.number },
    })

    if (existingNumber) {
      // Number already purchased, just return success
      return NextResponse.json({
        success: true,
        phoneNumber: existingNumber,
        vapiNumberId: existingNumber.vapiNumberId,
        message: 'Number already purchased',
      })
    }

    const phoneNumber = await prisma.phoneNumber.create({
      data: {
        projectId: input.projectId,
        e164: vapiNumber.number,
        vapiNumberId: vapiNumber.id,
        label: 'Main',
        serverUrl,
        serverUrlSecret,
      },
    })

    await prisma.eventLog.create({
      data: {
        projectId: input.projectId,
        type: 'number.purchased',
        payload: { numberId: phoneNumber.id, e164: vapiNumber.number },
      },
    })

    return NextResponse.json({
      success: true,
      phoneNumber,
      vapiNumberId: vapiNumber.id,
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
