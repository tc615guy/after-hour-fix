import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await req.json()
    const startTime = body.slotStart ? new Date(body.slotStart) : null
    const endTime = body.slotEnd ? new Date(body.slotEnd) : null
    const booking = await prisma.booking.create({
      data: {
        projectId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        address: body.address,
        notes: body.notes,
        slotStart: startTime,
        slotEnd: endTime,
        priceCents: body.priceCents ?? null,
        status: body.status || 'pending',
        technicianId: body.technicianId || null, // Assign technician if provided
      },
    })
    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Create failed' }, { status: 500 })
  }
}

