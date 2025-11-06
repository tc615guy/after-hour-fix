import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createCalComClient } from '@/lib/calcom'

/**
 * Reschedule booking by phone number
 * Used by AI to reschedule customer appointments
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerPhone, projectId, newStartTime, reason } = body

    if (!customerPhone || !projectId || !newStartTime) {
      return NextResponse.json(
        { error: 'customerPhone, projectId, and newStartTime are required' },
        { status: 400 }
      )
    }

    // Normalize phone number
    const phoneDigits = customerPhone.replace(/\D/g, '').slice(-10)

    // Find the most recent active booking
    const existing = await prisma.booking.findFirst({
      where: {
        projectId,
        customerPhone: {
          contains: phoneDigits,
        },
        status: {
          notIn: ['canceled', 'completed', 'failed'],
        },
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!existing) {
      return NextResponse.json(
        { 
          error: 'No active booking found for this phone number',
          result: 'I couldn\'t find an active appointment for that number. Can you verify the phone number?'
        },
        { status: 404 }
      )
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const start = new Date(newStartTime)
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Invalid newStartTime' }, { status: 400 })
    }

    // Determine duration from existing booking
    let durationMin = 60
    if (existing.slotStart && existing.slotEnd) {
      const d = (new Date(existing.slotEnd).getTime() - new Date(existing.slotStart).getTime()) / 60000
      if (d > 0) durationMin = Math.round(d)
    }

    const end = new Date(start.getTime() + durationMin * 60000)

    // Update Cal.com booking if it exists
    let calcomBookingId = existing.calcomBookingId
    let calcomBookingUid = existing.calcomBookingUid

    if (project.calcomApiKey && existing.calcomBookingId) {
      try {
        const cal = createCalComClient(project.calcomApiKey)
        // Cal.com doesn't have a direct update endpoint, so we cancel old and create new
        // For now, just update our database - Cal.com sync will handle it
        // TODO: Implement proper Cal.com reschedule if they have an API for it
      } catch (e) {
        console.error('[Reschedule] Cal.com update error:', e)
        // Continue anyway - we'll update our DB
      }
    }

    // Update the booking in our database
    const updated = await prisma.booking.update({
      where: { id: existing.id },
      data: {
        slotStart: start,
        slotEnd: end,
        notes: `${existing.notes || ''}${reason ? `\n[RESCHEDULED: ${reason}]` : '\n[RESCHEDULED by customer request]'}`.trim(),
        updatedAt: new Date(),
      },
    })

    // Log the reschedule
    await prisma.eventLog.create({
      data: {
        projectId,
        type: 'booking.rescheduled',
        payload: {
          bookingId: existing.id,
          customerPhone,
          oldTime: existing.slotStart?.toISOString(),
          newTime: start.toISOString(),
          reason: reason || 'customer request',
        },
      },
    })

    const projectTimezone = project.timezone || 'America/Chicago'
    const displayTime = start.toLocaleString('en-US', {
      timeZone: projectTimezone,
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: true,
    })

    return NextResponse.json({
      success: true,
      result: `Your appointment has been rescheduled to ${displayTime}.`,
      booking: {
        id: updated.id,
        customerName: updated.customerName,
        slotStart: updated.slotStart,
        slotEnd: updated.slotEnd,
        displayTime,
      },
    })
  } catch (error: any) {
    console.error('[Reschedule Booking] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reschedule booking' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'

