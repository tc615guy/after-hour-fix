import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { startOfWeek } from 'date-fns'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Use rolling 24h window for "today" to avoid timezone edge cases
    const today = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const weekStart = startOfWeek(new Date())

    const [callsToday, bookingsWeek, callsThisPeriod, bookingsThisWeek, project, sub] = await Promise.all([
      prisma.call.count({
        where: {
          projectId: id,
          createdAt: { gte: today },
        },
      }),
      prisma.booking.count({
        where: {
          projectId: id,
          createdAt: { gte: weekStart },
        },
      }),
      // CRITICAL FIX: Calculate minutes from Call table, not agent.minutesThisPeriod
      // This works for both OpenAI Realtime and Vapi calls
      prisma.call.findMany({
        where: { 
          projectId: id,
          deletedAt: null,
        },
        select: { durationSec: true, createdAt: true },
      }),
      prisma.booking.findMany({
        where: {
          projectId: id,
          createdAt: { gte: weekStart },
          status: { in: ['booked', 'completed'] },
        },
        select: { priceCents: true },
      }),
      prisma.project.findUnique({ where: { id }, include: { owner: true } }),
      (async () => {
        const proj = await prisma.project.findUnique({ where: { id } })
        if (!proj) return null
        return prisma.subscription.findFirst({
          where: { userId: proj.ownerId, status: { in: ['active', 'trialing'] } },
          orderBy: { updatedAt: 'desc' },
        })
      })(),
    ])

    // Calculate total minutes from all calls with durationSec
    // This is the SOURCE OF TRUTH for AI minutes usage
    const totalSeconds = callsThisPeriod
      .filter(c => c.durationSec !== null && c.durationSec !== undefined)
      .reduce((sum, c) => sum + c.durationSec!, 0)
    const minutesUsed = Math.ceil(totalSeconds / 60) // Round up to nearest minute
    const estRevenue = bookingsThisWeek.reduce((sum, b) => sum + (b.priceCents || 0), 0)

    const proId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
    const ultraId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ULTRA
    const cap = sub && ultraId && sub.priceId === ultraId ? 1200
      : sub && proId && sub.priceId === proId ? 800
      : 300
    const stats = {
      callsToday,
      bookingsWeek,
      minutesUsed,
      estRevenue,
      minutesCap: cap,
      allowOverage: Boolean(project?.allowOverage),
      membershipActive: project?.membershipActive !== false,
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('Get stats error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
