/**
 * Google Calendar Webhook Handler
 * Receives push notifications from Google Calendar API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { importFromExternal } from '@/lib/calendar/sync'

export async function POST(req: NextRequest) {
  try {
    // Google sends these headers
    const channelId = req.headers.get('x-goog-channel-id')
    const resourceId = req.headers.get('x-goog-resource-id')
    const resourceState = req.headers.get('x-goog-resource-state')
    const channelToken = req.headers.get('x-goog-channel-token')

    console.log('[Google Webhook]', {
      channelId,
      resourceId,
      resourceState,
      channelToken,
    })

    // Ignore sync messages (only process exists/not_exists for actual changes)
    if (resourceState === 'sync') {
      return NextResponse.json({ ok: true, message: 'Sync ignored' })
    }

    if (!channelId) {
      return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 })
    }

    // Find account by channel ID
    const account = await prisma.externalCalendarAccount.findFirst({
      where: {
        provider: 'google',
        webhookChannelId: channelId,
      },
    })

    if (!account) {
      console.warn(`[Google Webhook] Account not found for channel: ${channelId}`)
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Trigger import sync (debounced)
    // In production, you'd enqueue this to a job queue
    console.log(`[Google Webhook] Triggering sync for account: ${account.id}`)

    // Use setTimeout to debounce bursts of notifications
    setTimeout(async () => {
      try {
        await importFromExternal({
          userId: account.userId,
          accountId: account.id,
          since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
        })
      } catch (error) {
        console.error('[Google Webhook] Sync error:', error)
      }
    }, 5000) // 5 second delay to batch multiple notifications

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[Google Webhook] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

