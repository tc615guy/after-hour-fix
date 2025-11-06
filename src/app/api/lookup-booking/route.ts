import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Look up existing bookings by phone number
 * Used by AI to find customer appointments
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerPhone, projectId } = body

    if (!customerPhone || !projectId) {
      return NextResponse.json(
        { error: 'customerPhone and projectId are required' },
        { status: 400 }
      )
    }

    // Normalize phone number (last 10 digits)
    const phoneDigits = customerPhone.replace(/\D/g, '').slice(-10)

    // Find active bookings for this phone number
    const bookings = await prisma.booking.findMany({
      where: {
        projectId,
        customerPhone: {
          contains: phoneDigits,
        },
        status: {
          notIn: ['canceled', 'completed', 'failed'],
        },
        deletedAt: null,
      },
      orderBy: {
        slotStart: 'asc', // Most recent first
      },
      take: 5, // Limit to 5 most recent
    })

    if (bookings.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'No active appointments found for this phone number.',
        bookings: [],
      })
    }

    // Format bookings for AI
    const formattedBookings = bookings.map((booking) => {
      const slotTime = booking.slotStart
        ? new Date(booking.slotStart)
        : null
      
      const projectTimezone = 'America/Chicago' // TODO: Get from project
      const displayTime = slotTime
        ? slotTime.toLocaleString('en-US', {
            timeZone: projectTimezone,
            dateStyle: 'short',
            timeStyle: 'short',
            hour12: true,
          })
        : 'Time TBD'

      return {
        id: booking.id,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        address: booking.address,
        slotStart: booking.slotStart,
        slotEnd: booking.slotEnd,
        displayTime,
        status: booking.status,
        notes: booking.notes,
      }
    })

    return NextResponse.json({
      success: true,
      found: true,
      message: `Found ${bookings.length} active appointment${bookings.length > 1 ? 's' : ''}.`,
      bookings: formattedBookings,
    })
  } catch (error: any) {
    console.error('[Lookup Booking] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to lookup booking' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'

