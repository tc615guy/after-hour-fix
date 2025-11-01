import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createCalComClient } from '@/lib/calcom'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; bid: string }> }) {
  try {
    const { id: projectId, bid } = await params
    const body = await req.json().catch(() => ({}))
    const newStartTime = body?.newStartTime as string
    const reason = body?.reason as string | undefined
    const service = body?.service as string | undefined
    if (!newStartTime) return NextResponse.json({ error: 'Missing newStartTime' }, { status: 400 })

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || !project.calcomApiKey) return NextResponse.json({ error: 'Project not found or calendar not connected' }, { status: 400 })

    const existing = await prisma.booking.findUnique({ where: { id: bid } })
    if (!existing || existing.projectId !== projectId) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const start = new Date(newStartTime)
    if (isNaN(start.getTime())) return NextResponse.json({ error: 'Invalid newStartTime' }, { status: 400 })

    // Determine duration
    let durationMin = 60
    if (existing.slotStart && existing.slotEnd) {
      const d = (new Date(existing.slotEnd).getTime() - new Date(existing.slotStart).getTime()) / 60000
      if (d > 0) durationMin = Math.round(d)
    }
    // If service provided and pricing has durationMinutes, prefer it
    try {
      if (service && project.pricingSheet && Array.isArray((project.pricingSheet as any).items)) {
        const items = (project.pricingSheet as any).items as any[]
        const match = items.find((it) => (it.name || '').toString().toLowerCase() === service.toLowerCase())
        if (match?.durationMinutes && Number(match.durationMinutes) > 0) {
          durationMin = Number(match.durationMinutes)
        }
      }
    } catch {}

    const end = new Date(start.getTime() + durationMin * 60000)

    // Create new booking in Cal.com
    const cal = createCalComClient(project.calcomApiKey)
    const attendeeName = existing.customerName || 'Customer'
    const attendeeEmail = existing.customerPhone ? `${existing.customerPhone.replace(/\D/g, '')}@sms.afterhourfix.com` : 'noreply@afterhourfix.com'
    const calRes = await cal.createBooking({
      eventTypeId: project.calcomEventTypeId || undefined,
      start: start.toISOString(),
      end: end.toISOString(),
      attendee: {
        name: attendeeName,
        email: attendeeEmail,
        timeZone: project.timezone || 'UTC',
        phoneNumber: existing.customerPhone || undefined,
      },
      title: `${project.trade} Service - ${attendeeName}`,
      description: existing.notes || '',
      location: existing.address || undefined,
      metadata: { projectId, rescheduleOf: existing.id, service },
    })

    // Mark old booking canceled and create new booking row
    await prisma.booking.update({ where: { id: existing.id }, data: { status: 'canceled' } })
    const newBooking = await prisma.booking.create({
      data: {
        projectId,
        customerName: existing.customerName,
        customerPhone: existing.customerPhone,
        customerEmail: existing.customerEmail,
        address: existing.address,
        notes: `${existing.notes || ''}${reason ? `\n[RESCHEDULED: ${reason}]` : ''}`.trim(),
        slotStart: start,
        slotEnd: end,
        status: 'booked',
        calcomBookingId: calRes.id,
        calcomBookingUid: calRes.uid,
      },
    })

    await prisma.eventLog.create({ data: { projectId, type: 'booking.rescheduled', payload: { from: existing.id, to: newBooking.id } } })

    return NextResponse.json({ success: true, newBooking })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to reschedule' }, { status: 500 })
  }
}

export const runtime = 'nodejs'

