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

    const [callsToday, bookingsWeek, agents, bookingsThisWeek, project, sub] = await Promise.all([
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
      prisma.agent.findMany({
        where: { projectId: id },
        select: { minutesThisPeriod: true },
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

    const minutesUsed = agents.reduce((sum, a) => sum + a.minutesThisPeriod, 0)
    const estRevenue = bookingsThisWeek.reduce((sum, b) => sum + (b.priceCents || 0), 0)

    const proId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
    const premiumId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM
    const cap = sub && premiumId && sub.priceId === premiumId ? 2500
      : sub && proId && sub.priceId === proId ? 1200
      : 500
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
