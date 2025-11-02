import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVapiClient } from '@/lib/vapi'
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

    const vapiClient = createVapiClient()
    const numbers = await vapiClient.searchPhoneNumbers(areaCode)

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

    console.log('Agent lookup result:', agent)
    console.log('Agent projectId:', agent?.projectId, 'Expected projectId:', input.projectId)

    if (!agent || agent.projectId !== input.projectId) {
      console.log('Agent not found or projectId mismatch')
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const vapiClient = createVapiClient()

    // Fetch project to get forwarding number for fallback
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    })

    // If no specific number, search and pick first available
    let numberToPurchase = input.number
    if (!numberToPurchase) {
      try {
        const areaCode = input.areaCode || '205' // Default to 205 (Birmingham, AL) if not specified
        const availableNumbers = await vapiClient.searchPhoneNumbers(areaCode)
        if (availableNumbers.length === 0) {
          return NextResponse.json({ 
            error: `No numbers available in area code ${areaCode}. Try a different area code.` 
          }, { status: 404 })
        }
        numberToPurchase = availableNumbers[0].number
      } catch (searchError: any) {
        console.error('Error searching for available numbers:', searchError)
        return NextResponse.json({ 
          error: `Failed to search for numbers: ${searchError.message}. Please check your VAPI_API_KEY and that ENABLE_MOCK_MODE is false.` 
        }, { status: 500 })
      }
    }

    // Configure server URL and fallback destination
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const serverUrl = `${appUrl}/api/vapi/webhook`
    const serverUrlSecret = process.env.VAPI_WEBHOOK_SECRET

    const vapiNumber = await vapiClient.purchasePhoneNumber(numberToPurchase, agent.vapiAssistantId, {
      serverUrl,
      serverUrlSecret,
      fallbackDestination: project?.forwardingNumber || undefined,
    })

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
