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
    if (!project.calcomApiKey) return NextResponse.json({ error: 'Cal.com not connected for this project' }, { status: 400 })

    const cal = createCalComClient(project.calcomApiKey)

    // Import window
    const now = new Date()
    const from = start ? new Date(start).toISOString() : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const to = end ? new Date(end).toISOString() : new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()

    const bookings = await cal.listBookings({ eventTypeId: project.calcomEventTypeId || undefined, from, to })

    let created = 0
    let updated = 0

    for (const b of bookings) {
      const slotStart = b.startTime
      const slotEnd = b.endTime
      const attendee = Array.isArray(b.attendees) && b.attendees.length > 0 ? b.attendees[0] : undefined
      const existing = await prisma.booking.findFirst({
        where: {
          projectId,
          OR: [
            { calcomBookingId: typeof b.id === 'number' ? b.id : undefined },
            { calcomBookingUid: b.uid || undefined },
          ],
        },
      })

      const data = {
        projectId,
        customerName: attendee?.name || null,
        customerEmail: attendee?.email || null,
        address: undefined as any,
        notes: b.description || null,
        slotStart: slotStart ? new Date(slotStart) : null,
        slotEnd: slotEnd ? new Date(slotEnd) : null,
        status: (b.status || 'booked') as string,
        calcomBookingId: typeof b.id === 'number' ? b.id : null,
        calcomBookingUid: b.uid || null,
      }

      if (existing) {
        await prisma.booking.update({ where: { id: existing.id }, data })
        updated++
      } else {
        await prisma.booking.create({ data })
        created++
      }
    }

    return NextResponse.json({ success: true, imported: bookings.length, created, updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 })
  }
}
