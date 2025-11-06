import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Cancel a booking by phone number
 * Used by AI to cancel customer appointments
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerPhone, projectId, reason } = body

    if (!customerPhone || !projectId) {
      return NextResponse.json(
        { error: 'customerPhone and projectId are required' },
        { status: 400 }
      )
    }

    // Find the most recent active booking for this phone number
    const booking = await prisma.booking.findFirst({
      where: {
        projectId,
        customerPhone: {
          contains: customerPhone.replace(/\D/g, '').slice(-10), // Last 10 digits
        },
        status: {
          notIn: ['canceled', 'completed', 'failed'],
        },
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!booking) {
      return NextResponse.json(
        { 
          error: 'No active booking found for this phone number',
          result: 'I couldn\'t find an active appointment for that number. Can you verify the phone number?'
        },
        { status: 404 }
      )
    }

    // Update booking status to canceled
    const notes = booking.notes || ''
    const cancelNote = reason ? `\n[CANCELED: ${reason}]` : '\n[CANCELED by customer request]'
    
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'canceled',
        notes: notes + cancelNote,
      },
    })

    // Log the cancellation
    await prisma.eventLog.create({
      data: {
        projectId,
        type: 'booking.canceled',
        payload: {
          bookingId: booking.id,
          customerPhone,
          reason: reason || 'customer request',
          canceledAt: new Date().toISOString(),
        },
      },
    })

    const appointmentTime = booking.slotStart 
      ? new Date(booking.slotStart).toLocaleString('en-US', {
          timeZone: 'America/Chicago',
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : 'your appointment'

    return NextResponse.json({
      success: true,
      result: `Your appointment for ${appointmentTime} has been canceled. Call anytime if you need to reschedule.`,
      booking: {
        id: booking.id,
        customerName: booking.customerName,
        slotStart: booking.slotStart,
      },
    })
  } catch (error: any) {
    console.error('[Cancel Booking] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel booking' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'

