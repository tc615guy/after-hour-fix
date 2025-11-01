import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createCalComClient } from '@/lib/calcom'

export async function POST(req: NextRequest) {
  try {
    const { provider, projectId, start, end } = await req.json()
    if (!provider || !projectId) {
      return NextResponse.json({ error: 'Missing provider or projectId' }, { status: 400 })
    }

    if (provider !== 'calcom') {
      return NextResponse.json({ success: false, message: 'Provider not supported yet. Coming soon.' }, { status: 200 })
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!project.calcomApiKey || !project.calcomEventTypeId) {
      return NextResponse.json({ error: 'Cal.com not fully connected for this project' }, { status: 400 })
    }

    const cal = createCalComClient(project.calcomApiKey)

    // Export window: next 60 days of local bookings that have no calcom id
    const now = new Date()
    const fromDate = start ? new Date(start) : now
    const to = end ? new Date(end) : new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

    const local = await prisma.booking.findMany({
      where: {
        projectId,
        calcomBookingId: null,
        slotStart: { gte: fromDate, lte: to },
        status: { in: ['booked', 'pending'] },
      },
      orderBy: { slotStart: 'asc' },
      take: 50,
    })

    let pushed = 0
    for (const bk of local) {
      try {
        const start = (bk.slotStart || new Date()).toISOString()
        const attendeeName = bk.customerName || 'Customer'
        const attendeeEmail = bk.customerEmail || 'no-email@afterhourfix.local'
        const timeZone = project.timezone || 'America/Chicago'

        const created = await cal.createBooking({
          eventTypeId: project.calcomEventTypeId || undefined,
          start,
          attendee: {
            name: attendeeName,
            email: attendeeEmail,
            timeZone,
            phoneNumber: bk.customerPhone || undefined,
          },
          location: bk.address || '',
          description: bk.notes || '',
          title: 'Service Appointment',
          metadata: { bookingId: bk.id },
        })

        await prisma.booking.update({
          where: { id: bk.id },
          data: {
            calcomBookingId: created.id,
            calcomBookingUid: created.uid,
            status: 'booked',
          },
        })
        pushed++
      } catch (e: any) {
        console.error('[Scheduling Export] Failed to push booking', bk.id, e.message)
      }
    }

    return NextResponse.json({ success: true, attempted: local.length, pushed })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 })
  }
}
