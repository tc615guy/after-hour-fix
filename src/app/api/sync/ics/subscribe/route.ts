/**
 * ICS Calendar Subscription
 * Subscribe to an external ICS feed
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { isValidIcsUrl } from '@/lib/calendar/utils'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { icsUrl, name, direction = 'import' } = body

    if (!icsUrl) {
      return NextResponse.json({ error: 'ICS URL is required' }, { status: 400 })
    }

    // Validate ICS URL
    if (!isValidIcsUrl(icsUrl)) {
      return NextResponse.json({ error: 'Invalid ICS URL format' }, { status: 400 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Test fetching the ICS feed
    try {
      const testResponse = await fetch(icsUrl, {
        headers: {
          'User-Agent': 'AfterHourFix-Calendar/1.0',
        },
      })

      if (!testResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch ICS feed: ${testResponse.statusText}` },
          { status: 400 }
        )
      }

      const contentType = testResponse.headers.get('content-type')
      if (!contentType?.includes('calendar') && !contentType?.includes('text')) {
        console.warn(`[ICS] Unexpected content type: ${contentType}`)
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to fetch ICS feed: ${error.message}` },
        { status: 400 }
      )
    }

    // Check if already subscribed
    const existing = await prisma.externalCalendarAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'ics',
        icsUrl,
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Already subscribed to this ICS feed' }, { status: 400 })
    }

    // Create account
    const account = await prisma.externalCalendarAccount.create({
      data: {
        userId: user.id,
        provider: 'ics',
        icsUrl,
        lastSyncedAt: new Date(),
      },
    })

    // Create mapping
    await prisma.calendarMapping.create({
      data: {
        userId: user.id,
        accountId: account.id,
        provider: 'ics',
        direction,
        visibility: 'busyOnly', // ICS imports are always busy-only for privacy
        enabled: true,
      },
    })

    // Log sync
    await prisma.syncLog.create({
      data: {
        userId: user.id,
        source: 'ics',
        direction: 'import',
        status: 'ok',
        summary: `Subscribed to ICS feed: ${name || icsUrl}`,
        payload: { icsUrl, name },
      },
    })

    return NextResponse.json({
      success: true,
      accountId: account.id,
      message: 'Successfully subscribed to ICS feed',
    })
  } catch (error: any) {
    console.error('[ICS Subscribe] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

