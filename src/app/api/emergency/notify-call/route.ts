import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * TwiML endpoint for emergency dispatch phone calls to technicians
 * This is called by Twilio when the call connects (GET request)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get('bookingId')
    const technicianId = searchParams.get('technicianId')

    if (!bookingId || !technicianId) {
      console.error('[Emergency Notify Call] Missing bookingId or technicianId')
      return new NextResponse('Missing parameters', { status: 400 })
    }

    // Fetch booking details for personalized message
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        project: true,
        technician: true,
      },
    })

    if (!booking) {
      console.error(`[Emergency Notify Call] Booking not found: ${bookingId}`)
      return new NextResponse('Booking not found', { status: 404 })
    }

    // Build personalized emergency message
    const customerName = booking.customerName || 'a customer'
    const address = booking.address || 'the service address'
    const issue = booking.notes?.replace('[EMERGENCY DISPATCH]', '').trim() || 'emergency service'
    
    const message = `You have an emergency dispatch from ${booking.project.name}. Customer: ${customerName}. Address: ${address}. Issue: ${issue}. Please check your text messages for complete details including the customer's phone number. Reply with the number 1 to acknowledge you are en route.`

    // Return TwiML to play the message
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${message}</Say>
  <Pause length="2"/>
  <Say voice="alice">Please check your text messages for complete details.</Say>
  <Say voice="alice">Reply with the number 1 to acknowledge you are en route.</Say>
</Response>`

    return new NextResponse(twiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  } catch (error: any) {
    console.error('[Emergency Notify Call] Error:', error)
    return new NextResponse('Error generating TwiML', { status: 500 })
  }
}

