import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/demo/:projectId
 * Returns demo recording URL for marketing preview
 * Public endpoint - no auth required (for embedding in ads)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params

    // Get project's first agent with demo recording
    const agent = await prisma.agent.findFirst({
      where: {
        projectId,
        demoRecordingUrl: { not: null },
      },
      include: {
        project: {
          select: {
            name: true,
            trade: true,
          },
        },
      },
    })

    if (!agent || !agent.demoRecordingUrl) {
      // If no demo recording, get best call recording
      const bestCall = await prisma.call.findFirst({
        where: {
          projectId,
          isDemo: true,
          recordingUrl: { not: null },
          voiceConfidence: { gte: 0.8 },
        },
        orderBy: {
          voiceConfidence: 'desc',
        },
        include: {
          bookings: true,
        },
      })

      if (bestCall) {
        return NextResponse.json({
          success: true,
          demo: {
            recordingUrl: bestCall.recordingUrl,
            transcript: bestCall.transcript,
            duration: bestCall.durationSec,
            intent: bestCall.intent,
            confidence: bestCall.voiceConfidence,
            outcome: bestCall.bookings.length > 0 ? 'booked' : 'handled',
          },
        })
      }

      return NextResponse.json(
        { error: 'No demo recording available yet' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      demo: {
        recordingUrl: agent.demoRecordingUrl,
        projectName: agent.project.name,
        trade: agent.project.trade,
        voice: agent.voice,
      },
    })
  } catch (error: any) {
    console.error('Get demo error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
