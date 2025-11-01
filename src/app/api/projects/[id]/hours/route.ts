import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body = await req.json()

    const { businessHours, forwardingEnabled, forwardingNumber, holidays, allowWeekendBooking, requireOnCallForWeekend } = body

    // Validate phone number if forwarding is enabled
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
        businessHours,
        forwardingEnabled,
        forwardingNumber,
        ...(holidays ? { holidays } : {}),
        ...(typeof allowWeekendBooking === 'boolean' ? { allowWeekendBooking } : {}),
        ...(typeof requireOnCallForWeekend === 'boolean' ? { requireOnCallForWeekend } : {}),
      },
    })

    return NextResponse.json({ success: true, project })
  } catch (error: any) {
    console.error('[Business Hours] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update business hours' },
      { status: 500 }
    )
  }
}
