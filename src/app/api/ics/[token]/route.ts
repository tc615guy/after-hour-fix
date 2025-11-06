/**
 * ICS Feed Publishing
 * Publishes internal bookings as ICS feed
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { buildIcs, buildServiceEvent, buildBusyBlock } from '@/lib/calendar/ics'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return new NextResponse('Token required', { status: 400 })
    }

    // Find ICS feed
    const feed = await prisma.icsFeed.findUnique({
      where: { token },
    })

    if (!feed || !feed.enabled) {
      return new NextResponse('Feed not found or disabled', { status: 404 })
    }

    // Build date range (past 30 days, future 180 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const until = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)

    // Query bookings based on feed configuration
    const where: any = {
      deletedAt: null,
      slotStart: {
        gte: since,
        lte: until,
      },
    }

    if (feed.projectId) {
      where.projectId = feed.projectId
    }

    if (feed.technicianId) {
      where.technicianId = feed.technicianId
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        technician: true,
      },
      orderBy: {
        slotStart: 'asc',
      },
    })

    // Build ICS events
    const events = bookings
      .filter((b) => b.slotStart && b.slotEnd)
      .map((booking) => {
        if (feed.includeNotes || feed.includePhone) {
          return buildServiceEvent(
            {
              id: booking.id,
              customerName: booking.customerName || undefined,
              customerPhone: booking.customerPhone || undefined,
              address: booking.address || undefined,
              notes: booking.notes || undefined,
              slotStart: booking.slotStart!,
              slotEnd: booking.slotEnd!,
              status: booking.status,
              technicianName: booking.technician?.name,
            },
            {
              includeNotes: feed.includeNotes,
              includePhone: feed.includePhone,
            }
          )
        } else {
          // Just show busy blocks for privacy
          return buildBusyBlock(
            booking.slotStart!,
            booking.slotEnd!,
            `${booking.id}@afterhourfix.com`
          )
        }
      })

    // Build ICS file
    const icsContent = buildIcs(events, {
      prodId: '-//AfterHourFix//Calendar 1.0//EN',
      calName: feed.name,
      calDescription: 'AfterHourFix Service Bookings',
    })

    // Return ICS file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${feed.name.replace(/[^a-z0-9]/gi, '_')}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error: any) {
    console.error('[ICS Feed] Error:', error)
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 })
  }
}

