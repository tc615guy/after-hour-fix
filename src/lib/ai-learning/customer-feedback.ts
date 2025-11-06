/**
 * Customer Feedback Collection
 * Sends SMS after calls to collect satisfaction ratings
 */

import { prisma } from '@/lib/db'
import twilio from 'twilio'

export interface FeedbackRequest {
  callId: string
  customerPhone: string
  projectId: string
}

export interface FeedbackResponse {
  callId: string
  rating: number // 1-5 stars
  comment?: string
  timestamp: Date
}

/**
 * Send feedback request SMS after call completion
 */
export async function sendFeedbackRequest(callId: string): Promise<boolean> {
  try {
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { 
        project: { 
          include: { numbers: true } 
        }, 
        bookings: true 
      },
    })

    if (!call || !call.project) {
      console.error('[Feedback] Call or project not found')
      return false
    }

    // Only send feedback request for completed calls with bookings
    if (call.status !== 'completed' || call.bookings.length === 0) {
      console.log('[Feedback] Skipping feedback request - call not completed or no booking')
      return false
    }

    const projectName = call.project.name
    const customerPhone = call.fromNumber

    // Create feedback token (simple encoding)
    const feedbackToken = Buffer.from(`${callId}:${Date.now()}`).toString('base64url')

    // Generate feedback URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
    const feedbackUrl = `${appUrl}/feedback/${feedbackToken}`

    // SMS message
    const message = `Thanks for calling ${projectName}! How was your experience? Rate us: ${feedbackUrl}`

    // Send SMS via Twilio
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const phoneNumber = call.project.numbers?.[0]?.e164 || process.env.TWILIO_PHONE_NUMBER
    if (!phoneNumber) {
      console.error('[Feedback] No phone number configured for project')
      return false
    }

    await twilioClient.messages.create({
      from: phoneNumber,
      to: customerPhone,
      body: message,
    })

    // Log feedback request sent
    await prisma.eventLog.create({
      data: {
        projectId: call.projectId,
        type: 'feedback.sent',
        payload: {
          callId,
          customerPhone,
          feedbackToken,
        },
      },
    })

    console.log(`[Feedback] Sent feedback request for call ${callId} to ${customerPhone}`)
    return true
  } catch (error: any) {
    console.error('[Feedback] Failed to send feedback request:', error)
    return false
  }
}

/**
 * Process incoming feedback response
 */
export async function processFeedbackResponse(
  token: string,
  rating: number,
  comment?: string
): Promise<boolean> {
  try {
    // Decode token to get callId
    const decoded = Buffer.from(token, 'base64url').toString()
    const [callId] = decoded.split(':')

    if (!callId) {
      console.error('[Feedback] Invalid feedback token')
      return false
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      console.error('[Feedback] Invalid rating')
      return false
    }

    // Get call
    const call = await prisma.call.findUnique({
      where: { id: callId },
    })

    if (!call) {
      console.error('[Feedback] Call not found')
      return false
    }

    // Store feedback in EventLog
    await prisma.eventLog.create({
      data: {
        projectId: call.projectId,
        type: 'feedback.received',
        payload: {
          callId,
          rating,
          comment: comment || null,
          timestamp: new Date().toISOString(),
        },
      },
    })

    // Update call voiceConfidence based on rating
    // High ratings (4-5) increase confidence, low ratings (1-2) decrease it
    let confidenceAdjustment = 0
    if (rating >= 4) {
      confidenceAdjustment = 0.1 // Boost confidence
    } else if (rating <= 2) {
      confidenceAdjustment = -0.2 // Lower confidence
    }

    if (confidenceAdjustment !== 0) {
      const newConfidence = Math.max(0, Math.min(1, (call.voiceConfidence || 1.0) + confidenceAdjustment))
      await prisma.call.update({
        where: { id: callId },
        data: { voiceConfidence: newConfidence },
      })
    }

    console.log(`[Feedback] Processed feedback for call ${callId}: ${rating} stars${comment ? ' with comment' : ''}`)
    return true
  } catch (error: any) {
    console.error('[Feedback] Failed to process feedback:', error)
    return false
  }
}

/**
 * Get feedback statistics for a project
 */
export async function getFeedbackStats(projectId: string) {
  const feedbackEvents = await prisma.eventLog.findMany({
    where: {
      projectId,
      type: 'feedback.received',
    },
    select: { payload: true },
  })

  const ratings = feedbackEvents.map(e => (e.payload as any).rating).filter(r => typeof r === 'number')
  
  if (ratings.length === 0) {
    return {
      totalFeedback: 0,
      averageRating: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }
  }

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const rating of ratings) {
    if (rating >= 1 && rating <= 5) {
      distribution[rating as keyof typeof distribution]++
    }
  }

  const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length

  return {
    totalFeedback: ratings.length,
    averageRating: Math.round(averageRating * 10) / 10,
    distribution,
  }
}

