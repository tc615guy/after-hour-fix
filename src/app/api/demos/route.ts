import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    // Fetch calls marked as demo recordings
    const demoCalls = await prisma.call.findMany({
      where: {
        isDemo: true,
        recordingUrl: { not: null },
        status: 'completed',
      },
      include: {
        project: {
          select: {
            name: true,
            trade: true,
          },
        },
        bookings: {
          select: {
            priceCents: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    const demos = demoCalls.map((call) => ({
      id: call.id,
      projectName: call.project.name,
      trade: call.project.trade,
      scenario: `${call.intent === 'emergency' ? 'Emergency' : 'Standard'} Service Call`,
      intent: call.intent || 'quote',
      durationSec: call.durationSec || 0,
      recordingUrl: call.recordingUrl,
      transcript: call.transcript || 'Transcript not available',
      confidence: call.voiceConfidence || 1.0,
      escalated: call.escalated,
      bookingValue: call.bookings[0]?.priceCents || 0,
      outcome: call.bookings.length > 0 ? 'Job booked successfully' : 'Call handled',
      createdAt: call.createdAt,
    }))

    return NextResponse.json({ demos })
  } catch (error: any) {
    console.error('Get demos error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Mark a call as a demo recording (admin only)
export async function POST(req: NextRequest) {
  try {
    const { callId, isDemo } = await req.json()

    if (!callId) {
      return NextResponse.json({ error: 'Missing callId' }, { status: 400 })
    }

    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: { isDemo },
    })

    return NextResponse.json({ success: true, call: updatedCall })
  } catch (error: any) {
    console.error('Mark demo error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
