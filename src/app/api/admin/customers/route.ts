import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    // Get all projects with detailed data (exclude soft-deleted)
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        owner: true,
        calls: {
          orderBy: { createdAt: 'desc' },
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
        },
        agents: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate metrics for each customer
    const proId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO

    const customers = await Promise.all(projects.map(async (project) => {
      const totalCalls = project.calls.length
      const answeredCalls = project.calls.filter(c => c.status === 'completed').length
      const callAnswerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0

      const totalBookings = project.bookings.length
      const bookingConversionRate = totalCalls > 0 ? (totalBookings / totalCalls) * 100 : 0

      const aiMinutesUsed = project.agents.reduce((sum, agent) => sum + agent.minutesThisPeriod, 0)

      // Determine plan cap based on active subscription
      const sub = await prisma.subscription.findFirst({
        where: { userId: project.ownerId, status: { in: ['active', 'trialing'] } },
        orderBy: { updatedAt: 'desc' },
      })
      const ultraId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ULTRA
      const cap = sub && ultraId && sub.priceId === ultraId ? 2500
        : sub && proId && sub.priceId === proId ? 1200
        : 500
      const minutesLeft = Math.max(0, cap - aiMinutesUsed)

      const estimatedRevenue = project.bookings.reduce((sum, booking) =>
        sum + (booking.priceCents || 0), 0
      )

      const lastCallDate = project.calls.length > 0
        ? project.calls[0].createdAt.toISOString()
        : null

      // Determine if churned (no calls in last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentCalls = project.calls.filter(c => new Date(c.createdAt) > thirtyDaysAgo)
      const isNewCustomer = new Date(project.createdAt) > thirtyDaysAgo
      const status = (recentCalls.length > 0 || isNewCustomer) ? 'active' : 'churned'

      return {
        id: project.id, // Use project ID as the customer ID
        userId: project.ownerId, // Keep user ID for reference
        projectId: project.id,
        name: project.name,
        email: project.owner.email,
        trade: project.trade,
        plan: project.plan,
        createdAt: project.createdAt.toISOString(),

        totalCalls,
        answeredCalls,
        callAnswerRate,

        totalBookings,
        bookingConversionRate,

        aiMinutesUsed,
        minutesLeft,
        minutesCap: cap,
        estimatedRevenue,

        lastCallDate,
        status,
      }
    }))

    return NextResponse.json({ customers })
  } catch (error: any) {
    console.error('Admin customers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
