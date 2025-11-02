import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVapiClient } from '@/lib/vapi'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body = await req.json()

    const {
      forwardingEnabled,
      forwardingNumber,
    } = body

    // Validate phone number format if enabled
    if (forwardingEnabled && forwardingNumber) {
      if (!forwardingNumber.match(/^\+?[1-9]\d{1,14}$/)) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Use E.164 format (e.g., +15551234567)' },
          { status: 400 }
        )
      }
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        forwardingEnabled,
        forwardingNumber,
      },
    })

    // Update Vapi phone numbers with new fallback destination
    if (forwardingEnabled && forwardingNumber) {
      try {
        const phoneNumbers = await prisma.phoneNumber.findMany({
          where: { projectId },
        })
        
        const vapiClient = createVapiClient()
        for (const phoneNumber of phoneNumbers) {
          if (phoneNumber.vapiNumberId) {
            await vapiClient.updatePhoneNumber(phoneNumber.vapiNumberId, {
              fallbackDestination: forwardingNumber,
            })
          }
        }
      } catch (vapiError: any) {
        console.error('[Vapi Update] Failed to update fallback destination:', vapiError?.message)
        // Don't fail the request if Vapi update fails - database was already updated
      }
    }

    return NextResponse.json({ success: true, project })
  } catch (error: any) {
    console.error('[Forwarding Settings] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update forwarding settings' },
      { status: 500 }
    )
  }
}
