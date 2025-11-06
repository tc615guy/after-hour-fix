/**
 * Microsoft Calendar Webhook Handler
 * Receives push notifications from Microsoft Graph API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { importFromExternal } from '@/lib/calendar/sync'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    console.log('[Microsoft Webhook] Received notification:', body)

    // Microsoft sends validation token on subscription creation
    const validationToken = body.validationToken || req.nextUrl.searchParams.get('validationToken')

    if (validationToken) {
      // Respond with validation token as plain text
      return new NextResponse(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Process notifications
    const notifications = body.value || [body]

    for (const notification of notifications) {
      const { subscriptionId, resource, changeType, clientState } = notification

      if (!subscriptionId) {
        console.warn('[Microsoft Webhook] Missing subscriptionId')
        continue
      }

      // Find account by webhook channel ID (subscriptionId)
      const account = await prisma.externalCalendarAccount.findFirst({
        where: {
          provider: 'microsoft',
          webhookChannelId: subscriptionId,
        },
      })

      if (!account) {
        console.warn(`[Microsoft Webhook] Account not found for subscription: ${subscriptionId}`)
        continue
      }

      console.log(`[Microsoft Webhook] ${changeType} on ${resource}`)

      // Trigger import sync (debounced)
      // In production, you'd enqueue this to a job queue
      setTimeout(async () => {
        try {
          await importFromExternal({
            userId: account.userId,
            accountId: account.id,
            since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
          })
        } catch (error) {
          console.error('[Microsoft Webhook] Sync error:', error)
        }
      }, 5000) // 5 second delay to batch multiple notifications
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[Microsoft Webhook] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

