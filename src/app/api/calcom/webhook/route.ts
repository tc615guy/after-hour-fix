import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'

/**
 * POST /api/calcom/webhook
 * Webhook endpoint for Cal.com events
 * Handles booking created, updated, canceled, etc.
 * 
 * This endpoint can be used to:
 * - Invalidate availability cache when bookings change
 * - Reconcile external edits from Cal.com
 * - Sync booking status changes
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eventType = body.triggerEvent || body.type || 'unknown'
    
    console.log(`[Cal.com Webhook] Received event: ${eventType}`, {
      id: body.payload?.id,
      uid: body.payload?.uid,
    })
    
    // Handle different event types
    switch (eventType) {
      case 'BOOKING_CREATED':
      case 'BOOKING_UPDATED':
      case 'BOOKING_CANCELLED':
      case 'BOOKING_RESCHEDULED': {
        const booking = body.payload?.booking || body.payload
        if (!booking) {
          return NextResponse.json({ error: 'Missing booking data' }, { status: 400 })
        }
        
        // Find project by Cal.com user or event type
        // Note: This assumes we can identify the project from Cal.com data
        // You may need to store Cal.com user ID -> project mapping
        const project = await prisma.project.findFirst({
          where: {
            calcomUser: booking.organizer?.email || undefined,
            deletedAt: null,
          },
        })
        
        if (!project) {
          console.warn(`[Cal.com Webhook] Project not found for booking ${booking.id}`)
          return NextResponse.json({ received: true, message: 'Project not found' }, { status: 200 })
        }
        
        // Log the webhook event for audit trail
        await audit({
          projectId: project.id,
          type: 'calcom.webhook',
          payload: {
            eventType,
            bookingId: booking.id,
            bookingUid: booking.uid,
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
          },
        })
        
        // TODO: Invalidate availability cache for this project
        // await invalidateAvailabilityCache(project.id)
        
        // TODO: Reconcile booking with our database
        // - Check if booking exists in our DB by calcomBookingUid
        // - Update status, times, etc.
        // - Handle external edits
        
        console.log(`[Cal.com Webhook] Processed ${eventType} for project ${project.id}`)
        
        return NextResponse.json({ 
          received: true, 
          eventType,
          projectId: project.id,
        }, { status: 200 })
      }
      
      default:
        console.log(`[Cal.com Webhook] Unhandled event type: ${eventType}`)
        return NextResponse.json({ received: true, message: 'Event type not handled' }, { status: 200 })
    }
  } catch (error: any) {
    console.error('[Cal.com Webhook] Error:', error)
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 })
  }
}

export const runtime = 'nodejs'

