import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { requireSession, ensureProjectAccess, rateLimit, captureException } from '@/lib/api-guard'
import { enqueue } from '@/lib/queue'
import { audit } from '@/lib/audit'

const BookingImportSchema = z.object({
  bookings: z.array(
    z.object({
      customerName: z.string(),
      customerPhone: z.string().optional(),
      customerEmail: z.string().optional(),
      slotStart: z.string().nullable(),
      status: z.string().default('booked'),
      priceCents: z.number().nullable().optional(),
      notes: z.string().optional(),
    })
  ),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `bookings:import:${projectId}:${ip}`, 10, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', projectId)
    const body = await req.json()
    const { bookings } = BookingImportSchema.parse(body)

    // Async mode toggle: ?async=1 or large batches default to async
    const url = new URL(req.url)
    const forceAsync = url.searchParams.get('async') === '1'
    if (forceAsync || bookings.length > 50) {
      // Create job record first
      const job = await prisma.importJob.create({
        data: { projectId, type: 'bookings.import', status: 'queued', total: bookings.length },
      })
      await enqueue('bookings', 'bookings.import', { jobId: job.id, projectId, bookings })
      await audit({ projectId, type: 'bookings.import.queued', payload: { count: bookings.length, jobId: job.id } })
      return NextResponse.json({ queued: true, count: bookings.length, jobId: job.id }, { status: 202 })
    }

    // Deduplicate against existing by AppointmentID tag when present, else slotStart + (phone or name)
    const toCreate: any[] = []
    for (const booking of bookings) {
      const slotStart = booking.slotStart ? new Date(booking.slotStart) : null
      const slotEnd = (booking as any).slotEnd ? new Date((booking as any).slotEnd) : null
      if (!slotStart || isNaN(slotStart.getTime())) continue
      const aptId = (booking as any).appointmentId ? String((booking as any).appointmentId).trim() : ''
      if (aptId) {
        const tag = `[APTID:${aptId}]`
        const exists = await prisma.booking.findFirst({ where: { projectId, notes: { contains: tag } } })
        if (exists) continue
      }
      const phoneDigits = (booking.customerPhone || '').replace(/\D/g, '')
      const existing = await prisma.booking.findFirst({
        where: {
          projectId,
          slotStart,
          OR: [
            phoneDigits ? { customerPhone: { contains: phoneDigits } } : { customerName: { equals: booking.customerName || '' } },
          ],
        },
      })
      if (existing) continue
      const status = (booking.status || '').toLowerCase() === 'scheduled' ? 'booked' : (booking.status || 'booked')
      const parts: string[] = []
      parts.push('[IMPORTED]')
      if (aptId) parts.push(`[APTID:${aptId}]`)
      const combinedNotes = booking.notes ? `${parts.join(' ')} ${booking.notes}` : parts.join(' ')
      toCreate.push({
        projectId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone || null,
        customerEmail: booking.customerEmail || null,
        slotStart,
        slotEnd: slotEnd && !isNaN(slotEnd.getTime()) ? slotEnd : null,
        status,
        priceCents: booking.priceCents || null,
        notes: combinedNotes,
      })
    }
    const created = await prisma.booking.createMany({ data: toCreate })
    await audit({ projectId, type: 'bookings.import.completed', payload: { count: created.count } })

    return NextResponse.json({ success: true, count: created.count })
  } catch (error: any) {
    captureException(error)
    console.error('Import bookings error:', error)
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    )
  }
}
