import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { requireSession, ensureProjectAccess } from '@/lib/api-guard'

const UpdateSystemTypeSchema = z.object({
  systemType: z.enum(['vapi', 'openai-realtime']),
})

/**
 * PUT /api/agents/:id/system-type
 * Update the system type for an agent (vapi vs openai-realtime)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params
    const body = await req.json()
    const { systemType } = UpdateSystemTypeSchema.parse(body)

    // Get agent with project for authorization
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { project: true },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Check authorization
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', agent.projectId)

    // Update agent system type
    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { systemType },
    })

    // Also update associated phone numbers to match (if needed)
    // For OpenAI Realtime, phone numbers need to be configured differently
    if (systemType === 'openai-realtime') {
      // Note: Phone numbers for OpenAI Realtime need to be configured with Twilio directly
      // This is handled separately in the phone number purchase flow
      await prisma.phoneNumber.updateMany({
        where: {
          projectId: agent.projectId,
          // Only update numbers that belong to this agent's project
          // We'll keep systemType separate per number for flexibility
        },
        data: {
          systemType: 'openai-realtime',
        },
      })
    }

    await prisma.eventLog.create({
      data: {
        projectId: agent.projectId,
        type: 'agent.system_type_changed',
        payload: {
          agentId: agent.id,
          oldSystemType: agent.systemType || 'vapi',
          newSystemType: systemType,
        },
      },
    })

    return NextResponse.json({
      success: true,
      agent: {
        id: updated.id,
        systemType: updated.systemType,
      },
    })
  } catch (error: any) {
    console.error('Update system type error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update system type' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agents/:id/system-type
 * Get the current system type for an agent
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        systemType: true,
        projectId: true,
      },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Check authorization
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', agent.projectId)

    return NextResponse.json({
      systemType: agent.systemType || 'vapi',
    })
  } catch (error: any) {
    console.error('Get system type error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get system type' },
      { status: 500 }
    )
  }
}
