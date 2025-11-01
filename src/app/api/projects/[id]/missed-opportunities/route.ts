import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    // Get date range - last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get all calls in the last 30 days
    const calls = await prisma.call.findMany({
      where: {
        projectId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    })

    // Get all bookings in the last 30 days
    const bookings = await prisma.booking.findMany({
      where: {
        projectId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    })

    const totalCalls = calls.length
    const answeredCalls = calls.filter(c => c.status === 'completed').length
    const missedCalls = totalCalls - answeredCalls
    const missedCallPercentage = totalCalls > 0 ? (missedCalls / totalCalls) * 100 : 0

    const totalBookings = bookings.length

    // Calculate average booking value
    const totalBookingValue = bookings.reduce((sum, b) => sum + (b.priceCents || 0), 0)
    const avgBookingValue = totalBookings > 0 ? totalBookingValue / totalBookings : 0

    // Calculate conversion rate (bookings / answered calls)
    const conversionRate = answeredCalls > 0 ? (totalBookings / answeredCalls) * 100 : 0

    // Estimate missed opportunities
    // Assume missed calls would convert at the same rate as answered calls
    const estimatedMissedBookings = Math.round(missedCalls * (conversionRate / 100))
    const estimatedMissedRevenue = estimatedMissedBookings * avgBookingValue

    const data = {
      totalCalls,
      answeredCalls,
      missedCalls,
      missedCallPercentage,
      totalBookings,
      avgBookingValue,
      conversionRate,
      estimatedMissedRevenue,
      estimatedMissedBookings,
      timeframe: 'Last 30 days',
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Missed opportunities calculation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
