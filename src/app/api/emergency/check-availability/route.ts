import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Check if on-call technician is available for emergency
 * Called by AI when customer has urgent issue
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      )
    }

    // Find on-call technicians available RIGHT NOW
    const onCallTechs = await prisma.technician.findMany({
      where: {
        projectId,
        isActive: true,
        isOnCall: true, // Currently available
      },
      orderBy: {
        priority: 'desc', // Higher priority first
      },
    })

    if (onCallTechs.length === 0) {
      // No one available
      return NextResponse.json({
        available: false,
        result: "I understand this is urgent. Unfortunately, we don't have a technician available right now, but I can get you scheduled for first thing tomorrow morning. What time works best for you?",
      })
    }

    // Get highest priority on-call tech
    const tech = onCallTechs[0]

    return NextResponse.json({
      available: true,
      technician: {
        id: tech.id,
        name: tech.name,
        phone: tech.phone,
      },
      result: `Great news! I have a technician available right now. ${tech.name} can be there within 30 minutes to an hour. Should I send them your way?`,
    })
  } catch (error: any) {
    console.error('[Emergency Check] Error:', error)
    return NextResponse.json(
      {
        available: false,
        error: error.message,
        result: "Let me schedule you for our earliest available slot tomorrow. What time works for you?",
      },
      { status: 500 }
    )
  }
}
