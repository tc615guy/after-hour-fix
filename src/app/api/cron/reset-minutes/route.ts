import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/cron/reset-minutes
// Header: x-cron-secret: <CRON_SECRET>
// Resets minutesThisPeriod to 0 for all agents that belong to users whose
// subscription period has ended since the last reset. Idempotent per period.

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-cron-secret') || ''
    const expected = process.env.CRON_SECRET || ''
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    const subs = await prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'trialing'] },
        currentPeriodEnd: { not: null },
      },
    })

    let resets = 0
    for (const sub of subs) {
      const periodEnd = sub.currentPeriodEnd
      if (!periodEnd) continue
      if (periodEnd > now) continue

      const already = await prisma.eventLog.findFirst({
        where: {
          type: 'minutes.reset',
          payload: {
            path: ['stripeSubId'],
            equals: sub.stripeSubId,
          } as any,
        },
      })
      if (already) continue

      // Reset minutes for all agents under projects owned by this user
      const projects = await prisma.project.findMany({ where: { ownerId: sub.userId }, select: { id: true } })
      const projectIds = projects.map((p) => p.id)
      if (projectIds.length > 0) {
        await prisma.agent.updateMany({
          where: { projectId: { in: projectIds } },
          data: { minutesThisPeriod: 0 },
        })
        resets += projectIds.length
      }

      await prisma.eventLog.create({
        data: {
          type: 'minutes.reset',
          payload: {
            stripeSubId: sub.stripeSubId,
            priceId: sub.priceId,
            periodEnd: periodEnd.toISOString(),
          },
        },
      })
    }

    return NextResponse.json({ success: true, resets })
  } catch (error: any) {
    console.error('[CRON reset-minutes] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

