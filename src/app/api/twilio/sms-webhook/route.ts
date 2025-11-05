import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Twilio SMS Webhook Handler
 * Receives incoming SMS messages and handles technician replies to emergency dispatches
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const from = formData.get('From') as string | null
    const to = formData.get('To') as string | null
    const body = formData.get('Body') as string | null

    if (!from || !body) {
      console.error('[SMS Webhook] Missing From or Body')
      return new NextResponse('Missing parameters', { status: 400 })
    }

    console.log(`[SMS Webhook] Received SMS from ${from} to ${to}: ${body}`)

    // Clean phone number
    let cleanPhone = from.replace(/\D/g, '')
    if (cleanPhone.length === 10) {
      cleanPhone = `+1${cleanPhone}`
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      cleanPhone = `+${cleanPhone}`
    } else if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+${cleanPhone}`
    }

    // Check if this is a technician replying to an emergency dispatch
    // Look for recent emergency bookings assigned to this technician
    // Normalize phone numbers for comparison (remove +, spaces, dashes, etc.)
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '')
    const normalizedFrom = normalizePhone(cleanPhone)
    
    // Find technician by phone number (try multiple formats)
    const technician = await prisma.technician.findFirst({
      where: {
        OR: [
          { phone: { contains: normalizedFrom } },
          { phone: { contains: normalizedFrom.slice(-10) } }, // Last 10 digits
          { phone: { contains: cleanPhone.replace('+', '') } },
        ],
        deletedAt: null,
      },
    })

    if (!technician) {
      console.log(`[SMS Webhook] No technician found for phone ${cleanPhone}`)
      // Return generic response
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you for your message.</Message>
</Response>`,
        {
          headers: {
            'Content-Type': 'text/xml',
          },
        }
      )
    }

    // Find recent emergency booking for this technician
    const recentEmergencyBooking = await prisma.booking.findFirst({
      where: {
        technicianId: technician.id,
        isEmergency: true,
        status: { in: ['pending', 'booked'] },
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
        },
        deletedAt: null,
      },
      include: {
        technician: true,
        project: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (recentEmergencyBooking && recentEmergencyBooking.technician) {
      // Check if the reply is an acknowledgment (1, yes, ok, on my way, etc.)
      const acknowledgmentPattern = /^(1|yes|y|ok|okay|ack|acknowledged|on my way|en route|heading there|got it|received)$/i
      const isAcknowledgment = acknowledgmentPattern.test(body.trim())

      if (isAcknowledgment) {
        // Update booking status to 'en_route'
        await prisma.booking.update({
          where: { id: recentEmergencyBooking.id },
          data: {
            status: 'en_route',
          },
        })

        // Log the acknowledgment
        await prisma.eventLog.create({
          data: {
            projectId: recentEmergencyBooking.projectId,
            type: 'emergency.acknowledged',
            payload: {
              bookingId: recentEmergencyBooking.id,
              technicianId: recentEmergencyBooking.technicianId,
              technicianPhone: cleanPhone,
              message: body,
            },
          },
        })

        console.log(`[SMS Webhook] Technician ${recentEmergencyBooking.technician.name} acknowledged emergency dispatch for booking ${recentEmergencyBooking.id}`)

        // Send confirmation SMS back to technician
        // Note: We can't send SMS from this route directly, but we could use TwiML to send a response
        // For now, we'll just log it and return success

        return new NextResponse(
          `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>✅ Acknowledged! Status updated to en route.</Message>
</Response>`,
          {
            headers: {
              'Content-Type': 'text/xml',
            },
          }
        )
      }
    }

    // If not an emergency acknowledgment, return a generic response
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you for your message. If this is regarding an emergency dispatch, please reply with "1" to acknowledge.</Message>
</Response>`,
      {
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    )
  } catch (error: any) {
    console.error('[SMS Webhook] Error:', error)
    return new NextResponse('Error processing SMS', { status: 500 })
  }
}

