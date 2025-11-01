import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSession, ensureProjectAccess, rateLimit, captureException } from '@/lib/api-guard'
import { enqueue } from '@/lib/queue'
import { audit } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `bookings:importBatch:${projectId}:${ip}`, 10, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', projectId)
    const body = await req.json()
    const rows = Array.isArray(body?.rows) ? body.rows : []
    if (!projectId || rows.length === 0) {
      return NextResponse.json({ error: 'Missing projectId or rows' }, { status: 400 })
    }

    const url = new URL(req.url)
    const forceAsync = url.searchParams.get('async') === '1'
    if (forceAsync || rows.length > 50) {
      const job = await prisma.importJob.create({
        data: { projectId, type: 'bookings.importBatch', status: 'queued', total: rows.length },
      })
      await enqueue('bookings', 'bookings.importBatch', { jobId: job.id, projectId, rows })
      await audit({ projectId, type: 'bookings.importBatch.queued', payload: { count: rows.length, jobId: job.id } })
      return NextResponse.json({ queued: true, count: rows.length, jobId: job.id }, { status: 202 })
    }

    const results: { index: number; status: 'ok' | 'error'; error?: string }[] = []
    let created = 0
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {}
      try {
        const slotStart = r.slotStart ? new Date(r.slotStart) : null
        const slotEnd = r.slotEnd ? new Date(r.slotEnd) : null
        if (!slotStart || isNaN(slotStart.getTime())) throw new Error('Invalid time value')
        // Dedup priority: AppointmentID tag if provided, else same projectId + slotStart + (phone or name)
        const aptId = (r.appointmentId || '').toString().trim()
        if (aptId) {
          const tag = `[APTID:${aptId}]`
          const existingByApt = await prisma.booking.findFirst({
            where: {
              projectId,
              notes: { contains: tag },
            },
          })
          if (existingByApt) {
            results.push({ index: i, status: 'error', error: 'Duplicate booking (AppointmentID)' })
            continue
          }
        }
        // Fallback dedupe
        const phoneDigits = (r.customerPhone || '').replace(/\D/g, '')
        const name = (r.customerName || '').trim().toLowerCase()
        const existing = await prisma.booking.findFirst({
          where: {
            projectId,
            slotStart,
            OR: [
              phoneDigits ? { customerPhone: { contains: phoneDigits } } : { customerName: { equals: r.customerName || '' } },
            ],
          },
        })
        if (existing) {
          results.push({ index: i, status: 'error', error: 'Duplicate booking' })
          continue
        }
        // Compose notes with tags & metadata
        const parts: string[] = []
        parts.push('[IMPORTED]')
        if (aptId) parts.push(`[APTID:${aptId}]`)
        if (r.jobNumber) parts.push(`[JOB:${r.jobNumber}]`)
        if (r.campaignSource) parts.push(`[SRC:${r.campaignSource}]`)
        if (r.notes) parts.push(String(r.notes))
        const combinedNotes = parts.join(' ')
        // Normalize status
        const status = (r.status || '').toLowerCase() === 'scheduled' ? 'booked' : (r.status || 'booked')
        // Build address if components provided
        const address = r.address || [r.street, r.city, r.state, r.zip].filter(Boolean).join(', ').trim() || null
        await prisma.booking.create({
          data: {
            projectId,
            customerName: r.customerName || 'Unknown',
            customerPhone: r.customerPhone || null,
            customerEmail: r.customerEmail || null,
            address,
            notes: combinedNotes,
            slotStart,
            slotEnd: slotEnd && !isNaN(slotEnd.getTime()) ? slotEnd : null,
            status,
            priceCents: typeof r.priceCents === 'number' ? r.priceCents : null,
          },
        })
        created++
        results.push({ index: i, status: 'ok' })
      } catch (e: any) {
        results.push({ index: i, status: 'error', error: e?.message || 'Failed to insert' })
      }
    }

    await audit({ projectId, type: 'bookings.importBatch.completed', payload: { created, total: rows.length } })
    return NextResponse.json({ success: true, created, results })
  } catch (error: any) {
    captureException(error)
    return NextResponse.json({ error: error.message || 'Failed to import' }, { status: 500 })
  }
}
