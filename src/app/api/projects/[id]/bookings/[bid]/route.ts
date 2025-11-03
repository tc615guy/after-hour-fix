import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bid: string }> }
) {
  try {
    const { id: projectId, bid } = await params
    const body = await req.json()
    const booking = await prisma.booking.findUnique({ where: { id: bid } })
    if (!booking || booking.projectId !== projectId) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    const isImported = (booking.notes || '').includes('[IMPORTED]')
    if (isImported) {
      return NextResponse.json({ error: 'Imported bookings cannot be modified' }, { status: 403 })
    }
    const data: any = {}
    if (typeof body.customerName === 'string') data.customerName = body.customerName
    if (typeof body.customerPhone === 'string') data.customerPhone = body.customerPhone
    if (typeof body.customerEmail === 'string') data.customerEmail = body.customerEmail
    if (typeof body.address === 'string') data.address = body.address
    if (typeof body.notes === 'string') data.notes = body.notes
    if (typeof body.status === 'string') data.status = body.status
    if (typeof body.calcomBookingId === 'number') data.calcomBookingId = body.calcomBookingId
    if (typeof body.calcomBookingUid === 'string') data.calcomBookingUid = body.calcomBookingUid
    if (typeof body.technicianId === 'string') data.technicianId = body.technicianId
    if (body.slotStart) {
      const d = new Date(body.slotStart)
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid time value' }, { status: 400 })
      data.slotStart = d
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No changes' }, { status: 400 })
    const updated = await prisma.booking.update({ where: { id: bid }, data })
    return NextResponse.json({ success: true, booking: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update booking' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bid: string }> }
) {
  try {
    const { id: projectId, bid } = await params
    const booking = await prisma.booking.findUnique({ where: { id: bid } })
    if (!booking || booking.projectId !== projectId) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    const isImported = (booking.notes || '').includes('[IMPORTED]')
    if (isImported) {
      return NextResponse.json({ error: 'Imported bookings cannot be deleted' }, { status: 403 })
    }
    await prisma.booking.delete({ where: { id: bid } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete booking' }, { status: 500 })
  }
}
