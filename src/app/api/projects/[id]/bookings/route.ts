import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSession, ensureProjectAccess, rateLimit, captureException } from '@/lib/api-guard'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `bookings:GET:${id}:${ip}`, 60, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', id)

    const url = new URL(req.url)
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')
    const rawLimit = url.searchParams.get('limit')
    const rawCursor = url.searchParams.get('cursor')
    const limit = Math.min(Math.max(Number(rawLimit || 200), 1), 500)
    const cursor = rawCursor && rawCursor.length > 0 ? rawCursor : undefined

    const where: any = { projectId: id, deletedAt: null }
    if (start || end) {
      where.slotStart = {}
      if (start) where.slotStart.gte = new Date(start)
      if (end) where.slotStart.lte = new Date(end)
    }

    const orderBy = start || end ? [{ slotStart: 'asc' as const }, { createdAt: 'desc' as const }] : [{ createdAt: 'desc' as const }]
    const bookings = await prisma.booking.findMany({
      where,
      orderBy,
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        technician: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const nextCursor = bookings.length === limit ? bookings[bookings.length - 1]?.id : undefined
    return NextResponse.json({ bookings, nextCursor })
  } catch (error: any) {
    captureException(error)
    console.error('Get bookings error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
