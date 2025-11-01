import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const UpdateEventTypeSchema = z.object({
  projectId: z.string(),
  length: z.number().min(15).max(480).optional(),
  afterEventBuffer: z.number().min(0).max(120).optional(),
  minimumBookingNotice: z.number().min(0).max(1440).optional(),
  slotInterval: z.number().optional(),
})

// GET - Fetch event type details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventTypeId } = await params
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Get project with Cal.com credentials
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const apiKey = project.calcomApiKey
    if (!apiKey) {
      return NextResponse.json({ error: 'Cal.com not connected' }, { status: 400 })
    }

    // Fetch event type from Cal.com
    const calcomRes = await fetch(`https://api.cal.com/v1/event-types/${eventTypeId}`, {
      headers: {
        'cal-api-version': '2024-08-13',
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!calcomRes.ok) {
      const error = await calcomRes.text()
      console.error('Cal.com fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch event type from Cal.com' },
        { status: 500 }
      )
    }

    const data = await calcomRes.json()

    return NextResponse.json({
      eventType: data.data || data.event_type || data,
    })
  } catch (error: any) {
    console.error('Get event type error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get event type' },
      { status: 500 }
    )
  }
}

// PATCH - Update event type settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventTypeId } = await params
    const body = await req.json()
    const validated = UpdateEventTypeSchema.parse(body)

    // Get project with Cal.com credentials
    const project = await prisma.project.findUnique({
      where: { id: validated.projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const apiKey = project.calcomApiKey
    if (!apiKey) {
      return NextResponse.json({ error: 'Cal.com not connected' }, { status: 400 })
    }

    // Prepare update payload (only include fields that were provided)
    const updatePayload: any = {}
    if (validated.length !== undefined) updatePayload.length = validated.length
    if (validated.afterEventBuffer !== undefined) updatePayload.afterEventBuffer = validated.afterEventBuffer
    if (validated.minimumBookingNotice !== undefined) updatePayload.minimumBookingNotice = validated.minimumBookingNotice
    if (validated.slotInterval !== undefined) updatePayload.slotInterval = validated.slotInterval

    // Update event type in Cal.com
    const calcomRes = await fetch(`https://api.cal.com/v1/event-types/${eventTypeId}`, {
      method: 'PATCH',
      headers: {
        'cal-api-version': '2024-08-13',
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    })

    if (!calcomRes.ok) {
      const error = await calcomRes.text()
      console.error('Cal.com update error:', error)
      return NextResponse.json(
        { error: 'Failed to update event type in Cal.com' },
        { status: 500 }
      )
    }

    const data = await calcomRes.json()

    return NextResponse.json({
      success: true,
      eventType: data.data || data.event_type || data,
    })
  } catch (error: any) {
    console.error('Update event type error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update event type' },
      { status: 500 }
    )
  }
}
