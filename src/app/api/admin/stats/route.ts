import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    // Get all projects with their metrics (exclude soft-deleted)
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        calls: true,
        bookings: true,
        agents: true,
        owner: true,
      },
    })

    // Calculate platform stats
    const totalCustomers = projects.length
    const totalCalls = projects.reduce((sum, p) => sum + p.calls.length, 0)
    const totalBookings = projects.reduce((sum, p) => sum + p.bookings.length, 0)

    // Calculate active vs churned (churned = no calls in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activeCustomers = projects.filter(p => {
      const recentCalls = p.calls.filter(c => new Date(c.createdAt) > thirtyDaysAgo)
      return recentCalls.length > 0 || new Date(p.createdAt) > thirtyDaysAgo
    }).length

    const churnedCustomers = totalCustomers - activeCustomers

    // Calculate average conversion rate
    const conversions = projects.map(p => {
      const calls = p.calls.length
      const bookings = p.bookings.length
      return calls > 0 ? (bookings / calls) * 100 : 0
    })
    const avgConversionRate = conversions.length > 0
      ? conversions.reduce((a, b) => a + b, 0) / conversions.length
      : 0

    // Calculate MRR and total revenue
    const planPrices: Record<string, number> = {
      'Starter': 14900, // $149 in cents
      'Pro': 29900,     // $299 in cents
      'Premium': 49900, // $499 in cents
    }

    const mrr = projects.reduce((sum, p) => {
      return sum + (planPrices[p.plan] || planPrices['Starter'])
    }, 0)

    const totalRevenue = projects.reduce((sum, p) => {
      return sum + p.bookings.reduce((bookingSum, b) => bookingSum + (b.priceCents || 0), 0)
    }, 0)

    const stats = {
      totalCustomers,
      activeCustomers,
      churnedCustomers,
      totalCalls,
      totalBookings,
      avgConversionRate,
      totalRevenue,
      mrr,
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
