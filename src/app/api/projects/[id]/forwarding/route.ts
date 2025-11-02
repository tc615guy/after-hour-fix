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
        console.log(`[Vapi Update] Updating fallback destination for project ${projectId} to ${forwardingNumber}`)
        const phoneNumbers = await prisma.phoneNumber.findMany({
          where: { projectId },
        })
        console.log(`[Vapi Update] Found ${phoneNumbers.length} phone numbers to update`)
        
        const vapiClient = createVapiClient()
        for (const phoneNumber of phoneNumbers) {
          if (phoneNumber.vapiNumberId) {
            console.log(`[Vapi Update] Updating number ${phoneNumber.e164} (Vapi ID: ${phoneNumber.vapiNumberId})`)
            await vapiClient.updatePhoneNumber(phoneNumber.vapiNumberId, {
              fallbackDestination: forwardingNumber,
            })
            console.log(`[Vapi Update] Successfully updated ${phoneNumber.e164}`)
          } else {
            console.log(`[Vapi Update] Skipping ${phoneNumber.e164} - no Vapi ID`)
          }
        }
      } catch (vapiError: any) {
        console.error('[Vapi Update] Failed to update fallback destination:', vapiError?.message)
        console.error('[Vapi Update] Error details:', vapiError?.response?.data || vapiError)
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
