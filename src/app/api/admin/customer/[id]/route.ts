import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // For MVP: check email from query parameter
    // In production: use proper authentication
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized - Email required' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { email },
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id: projectId } = await params

    // Find project with all related data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: true,
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 100, // Limit to recent 100 calls
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 100, // Limit to recent 100 bookings
        },
        agents: true,
        numbers: {
          where: { deletedAt: null },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const totalCalls = project.calls.length
    const answeredCalls = project.calls.filter(c => c.status === 'completed').length
    const callAnswerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0

    const totalBookings = project.bookings.length
    const bookingConversionRate = totalCalls > 0 ? (totalBookings / totalCalls) * 100 : 0

    const aiMinutesUsed = project.agents.reduce((sum, agent) => sum + agent.minutesThisPeriod, 0)

    // Cap / minutes left
    const proId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
    const premiumId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM
    const sub = await prisma.subscription.findFirst({
      where: { userId: project.ownerId, status: { in: ['active', 'trialing'] } },
      orderBy: { updatedAt: 'desc' },
    })
    const minutesCap = sub && premiumId && sub.priceId === premiumId ? 2500
      : sub && proId && sub.priceId === proId ? 1200
      : 500
    const minutesLeft = Math.max(0, minutesCap - aiMinutesUsed)

    const estimatedRevenue = project.bookings.reduce((sum, booking) =>
      sum + (booking.priceCents || 0), 0
    )

    const customer = {
      id: project.id, // Use project ID as customer ID
      userId: project.ownerId, // Keep user ID for reference
      projectId: project.id,
      name: project.name,
      email: project.owner.email,
      trade: project.trade,
      plan: project.plan,
      createdAt: project.createdAt.toISOString(),

      totalCalls,
      totalBookings,
      callAnswerRate,
      bookingConversionRate,
      estimatedRevenue,
      aiMinutesUsed,
      minutesLeft,
      minutesCap,

      adminNotes: project.adminNotes,

      calls: project.calls.map(call => ({
        id: call.id,
        vapiCallId: call.vapiCallId,
        fromNumber: call.fromNumber,
        toNumber: call.toNumber,
        status: call.status,
        durationSec: call.durationSec,
        intent: call.intent,
        createdAt: call.createdAt.toISOString(),
        transcript: call.transcript,
        recordingUrl: call.recordingUrl,
      })),

      bookings: project.bookings.map(booking => ({
        id: booking.id,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        slotStart: booking.slotStart?.toISOString() || null,
        status: booking.status,
        priceCents: booking.priceCents,
        isEmergency: booking.isEmergency,
        createdAt: booking.createdAt.toISOString(),
      })),

      numbers: project.numbers.map(num => ({
        id: num.id,
        e164: num.e164,
        label: num.label,
        vapiNumberId: num.vapiNumberId,
      })),
    }

    return NextResponse.json({ customer })
  } catch (error: any) {
    console.error('Admin customer detail error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
