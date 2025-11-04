import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createPendingBooking } from '@/lib/bookings'
import { createCalComClient } from '@/lib/calcom'
import { sendEmailAsync as sendEmail, buildConfirmationEmail } from '@/lib/email'
import { sendSMS, buildBookingConfirmationSMS } from '@/lib/sms'
import { z } from 'zod'

const BookingSchema = z.object({
  projectId: z.string().optional(),
  customerName: z.string(),
  customerPhone: z.string(),
  address: z.string(),
  notes: z.string(),
  startTime: z.string(),
  priorityUpsell: z.boolean().optional(),
  confirm: z.boolean().optional(),
  service: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Try multiple possible locations for parameters
    let params = body

    // Helper to safely parse arguments (might be string or object)
    const safeParseArgs = (args: any) => {
      if (typeof args === 'string') {
        return JSON.parse(args)
      }
      return args
    }

    // Check if it's wrapped in 'message'
    if (body.message?.toolCallList?.[0]?.function?.arguments) {
      params = safeParseArgs(body.message.toolCallList[0].function.arguments)
      console.log('[BOOK] Extracted from toolCallList.function.arguments')
    } else if (body.message?.call?.toolCalls?.[0]?.function?.arguments) {
      params = safeParseArgs(body.message.call.toolCalls[0].function.arguments)
      console.log('[BOOK] Extracted from call.toolCalls.function.arguments')
    } else if (body.parameters) {
      params = body.parameters
      console.log('[BOOK] Extracted from parameters')
    } else if (body.message?.toolCalls?.[0]?.function?.arguments) {
      params = safeParseArgs(body.message.toolCalls[0].function.arguments)
      console.log('[BOOK] Extracted from message.toolCalls.function.arguments')
    }

    console.log('[BOOK] Final extracted parameters:', JSON.stringify(params, null, 2))

    // Validate input and return helpful message if missing required fields
    const result = BookingSchema.safeParse(params)
    if (!result.success) {
      const missing = result.error.issues.map(i => i.path[0]).filter(Boolean)
      console.log('[BOOK] Validation failed. Missing fields:', missing)
      const errorMsg = `I still need a few more details to book this. Let me ask you about: ${missing.join(', ')}.`
      return NextResponse.json({
        result: errorMsg,
        error: errorMsg
      }, { status: 200 }) // Return 200 so Vapi reads the message
    }

    const input = result.data
    console.log('[BOOK] Validation passed:', JSON.stringify(input, null, 2))

    // Get project from header, param, or query (?projectId=...)
    const url = new URL(req.url)
    const projectId =
      input.projectId ||
      req.headers.get('x-project-id') ||
      url.searchParams.get('projectId') || undefined

    console.log('[BOOK] Project ID from input:', input.projectId)
    console.log('[BOOK] Project ID from header:', req.headers.get('x-project-id'))
    console.log('[BOOK] Project ID from query:', url.searchParams.get('projectId'))
    console.log('[BOOK] Final project ID:', projectId)

    if (!projectId) {
      console.log('[BOOK] ERROR: Missing project ID')
      const errorMsg = "I'm having trouble connecting to the booking system. Let me transfer you to someone who can help."
      return NextResponse.json({ result: errorMsg, error: 'Missing project ID' }, { status: 200 })
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: true, agents: { select: { minutesThisPeriod: true } } },
    })

    if (!project || !project.calcomApiKey) {
      console.log('[BOOK] ERROR: Project not found or Cal.com not connected')
      const errorMsg = "I'm having trouble accessing the calendar. Let me connect you with my manager to get this scheduled."
      return NextResponse.json({ result: errorMsg, error: 'Project not found or Cal.com not connected' }, { status: 200 })
    }

    console.log('[BOOK] Project found:', project.name)

    // Minutes cap enforcement (Starter=500, Pro=1200, Premium=500)
    try {
      const subs = await prisma.subscription.findFirst({
        where: { userId: project.ownerId, status: { in: ['active', 'trialing'] } },
        orderBy: { updatedAt: 'desc' },
      })
      const proId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
      const premiumId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM
      const cap = subs && premiumId && subs.priceId === premiumId ? 500
        : subs && proId && subs.priceId === proId ? 1200
        : 500
      const used = (project.agents || []).reduce((s, a) => s + (a.minutesThisPeriod || 0), 0)
      if (used >= cap) {
        const msg = "We’ve reached this month’s included AI minutes. Let me connect you to the office to finish booking."
        return NextResponse.json({ result: msg, error: 'Minutes cap reached' }, { status: 200 })
      }
    } catch (capErr) {
      console.warn('[BOOK] Cap check failed:', (capErr as any)?.message)
    }

    // Helper: pick Cal.com event type per trade with sensible fallback
    const resolveEventTypeId = (trade?: string): number | undefined => {
      const t = (trade || '').toLowerCase()
      const env = process.env as Record<string, string | undefined>
      const byTrade: Record<string, string> = {
        plumbing: 'CALCOM_EVENT_TYPE_ID_PLUMBING',
        hvac: 'CALCOM_EVENT_TYPE_ID_HVAC',
        electrical: 'CALCOM_EVENT_TYPE_ID_ELECTRICAL',
        towing: 'CALCOM_EVENT_TYPE_ID_TOWING',
      }
      const specificKey = byTrade[t]
      const specific = specificKey && env[specificKey] ? parseInt(env[specificKey] as string, 10) : undefined
      const globalDefault = env.CALCOM_EVENT_TYPE_ID ? parseInt(env.CALCOM_EVENT_TYPE_ID, 10) : undefined
      return specific || globalDefault
    }

    // Build Cal.com client and proposed times
    console.log('[BOOK] Creating Cal.com client...')
    const calcomClient = createCalComClient(project.calcomApiKey)
    const startTime = new Date(input.startTime)
    if (isNaN(startTime.getTime())) {
      return NextResponse.json({ result: "I couldn't parse the time. Could you repeat the date and time you want?", error: 'Invalid startTime' }, { status: 200 })
    }

    // Weekend policy
    const day = startTime.getUTCDay() // 0=Sun,6=Sat
    const isWeekend = day === 0 || day === 6
    if (isWeekend) {
      if (project.allowWeekendBooking === false) {
        return NextResponse.json({ result: "We aren't scheduling weekend visits. I can book you first thing Monday morning—what time works?", error: 'Weekend disabled' }, { status: 200 })
      }
      if (project.requireOnCallForWeekend) {
        const hasOnCall = await prisma.technician.findFirst({ where: { projectId, isOnCall: true, isActive: true } })
        if (!hasOnCall) {
          return NextResponse.json({ result: "We don't have weekend coverage today. I can schedule you for Monday at 8:00 am or 10:00 am. Which works better?", error: 'No weekend on-call' }, { status: 200 })
        }
      }
    }

    // Require explicit confirmation before creating the booking
    if (!input.confirm) {
      return NextResponse.json({ result: `I can book ${startTime.toLocaleString()}. Should I lock this in? Please say “Yes, book it.”`, error: 'Awaiting confirmation' }, { status: 200 })
    }

    // Calculate price and duration from pricing sheet
    let priceCents: number | null = null
    let durationMinutes = 60
    try {
      const ps: any = project.pricingSheet || {}
      const enabled = ps.enabled !== false
      const items: any[] = Array.isArray(ps.items) ? ps.items : []
      const text = `${(input.notes || '').toLowerCase()} ${input.address || ''}`
      let best: any | null = null
      let bestScore = 0
      for (const it of items) {
        const svc = String(it.service || '').toLowerCase()
        if (!svc) continue
        // simple keyword score
        let score = 0
        const words = svc.split(/\s+/)
        for (const w of words) if (w && text.includes(w)) score++
        if (score > bestScore) { bestScore = score; best = it }
      }
      if (enabled && best && typeof best.basePrice === 'number') {
        let amt = best.basePrice
        // crude after-hours/emergency detection
        const emergency = /(emergency|after\-hours|tonight|asap|immediately|burst|flood)/i.test(input.notes || '')
        const mult = emergency ? (project as any).emergencyMultiplier || 1 : 1
        amt = amt * mult
        priceCents = Math.round(amt * 100)
        if (best.durationMinutes && Number(best.durationMinutes) > 0) {
          durationMinutes = Number(best.durationMinutes)
        }
      }
    } catch { /* leave priceCents null */ }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)

    // DEDUPE: If an upcoming booking exists within 7 days for same phone, don't create second—ask to reschedule
    try {
      const phoneDigits = (input.customerPhone || '').replace(/\D/g, '')
      if (phoneDigits) {
        const now = new Date()
        const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        const existing = await prisma.booking.findFirst({
          where: {
            projectId,
            customerPhone: { contains: phoneDigits },
            slotStart: { gte: now, lte: until },
            status: { in: ['pending', 'booked'] },
          },
          orderBy: { createdAt: 'desc' },
        })
        if (existing) {
          const whenStr = existing.slotStart ? new Date(existing.slotStart).toLocaleString() : 'an existing time'
          return NextResponse.json({ result: `You already have a booking for ${whenStr}. Want me to reschedule it to ${startTime.toLocaleString()}?`, error: 'Existing booking' }, { status: 200 })
        }
      }
    } catch {}

    // Synchronous creation: pending -> Cal.com -> booked
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const createRes = await fetch(`${appUrl}/api/projects/${projectId}/bookings/quick-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            address: input.address,
            notes: input.notes,
            slotStart: startTime.toISOString(),
            slotEnd: endTime.toISOString(),
            status: 'pending',
          }),
        })
    const createdPayload = await createRes.json().catch(() => ({} as any))
    if (!createRes.ok) {
      return NextResponse.json({ result: "I couldn't finalize the booking. Let me try another time or connect you to the office.", error: createdPayload.error || 'Failed to create booking' }, { status: 200 })
    }
    const newBooking = createdPayload.booking

    // Create Cal.com booking using v2 API (matches availability endpoint)
    let calcomBooking: any
    let bookingUid: string | undefined
    try {
      const phoneDigits = (input.customerPhone || '').replace(/\D/g, '')
      const eventTypeId = resolveEventTypeId(project.trade) || project.calcomEventTypeId
      
      if (!eventTypeId) {
        throw new Error('No Cal.com event type configured')
      }
      
      // Step 1: Reserve the slot first (prevents race conditions)
      console.log('[BOOK] Reserving slot:', { start: startTime.toISOString(), end: endTime.toISOString() })
      const reserveRes = await fetch('https://api.cal.com/v2/slots/reserve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${project.calcomApiKey}`,
          'cal-api-version': '2024-08-12',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventTypeId: eventTypeId,
          slotUtcStartDate: startTime.toISOString(),
          slotUtcEndDate: endTime.toISOString(),
        }),
      })
      
      if (!reserveRes.ok) {
        const errorTxt = await reserveRes.text()
        console.error('[BOOK] Cal.com v2 reservation failed:', errorTxt.substring(0, 500))
        // Continue anyway - reservation is optional but recommended
      } else {
        const reserveData = await reserveRes.json()
        console.log('[BOOK] Slot reserved:', reserveData)
      }
      
      // Step 2: Create booking with correct v2 format
      // Cal.com v2 API: Minimal required fields based on documentation
      // The error "expected object, received undefined at path []" suggests the entire body is undefined
      // This could be a serialization issue or the API expects the data wrapped differently
      const bookingPayload: any = {
        eventTypeId: eventTypeId,
        start: startTime.toISOString(),
        attendee: {
          name: input.customerName,
          email: `${phoneDigits}@sms.afterhourfix.com`,
          timeZone: project.timezone || 'America/Chicago',
          language: 'en',
        },
        bookingFieldsResponses: {
          name: input.customerName,
          email: `${phoneDigits}@sms.afterhourfix.com`,
        },
        timeZone: project.timezone || 'America/Chicago',
        language: 'en',
      }
      
      // Add optional fields if they exist
      if (input.notes) {
        bookingPayload.bookingFieldsResponses.notes = input.notes
      }
      if (input.customerPhone) {
        bookingPayload.bookingFieldsResponses.phone = input.customerPhone
      }
      if (input.address) {
        bookingPayload.bookingFieldsResponses.location = input.address
      }

      console.log('[BOOK] Creating Cal.com v2 booking:', JSON.stringify(bookingPayload, null, 2))

      const bookingRes = await fetch('https://api.cal.com/v2/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${project.calcomApiKey}`,
          'cal-api-version': '2024-08-12',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      })
      
      if (!bookingRes.ok) {
        const errorTxt = await bookingRes.text()
        console.error('[BOOK] Cal.com v2 booking failed:', errorTxt.substring(0, 500))
        console.log('[BOOK] Falling back to Cal.com v1 API...')
        
        // FALLBACK: Use v1 API which we know works
        try {
          const v1Booking = await calcomClient.createBooking({
            eventTypeId: eventTypeId,
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            attendee: {
              name: input.customerName,
              email: `${phoneDigits}@sms.afterhourfix.com`,
              timeZone: project.timezone || 'America/Chicago',
              phoneNumber: input.customerPhone,
            },
            location: input.address,
            description: input.notes,
            metadata: {
              customerPhone: input.customerPhone,
              address: input.address,
              notes: input.notes,
            },
          })
          
          calcomBooking = v1Booking
          bookingUid = v1Booking?.uid
          console.log('[BOOK] Cal.com v1 fallback succeeded:', { id: calcomBooking?.id, uid: bookingUid })
        } catch (v1Error: any) {
          console.error('[BOOK] Cal.com v1 fallback also failed:', v1Error.message)
          throw new Error(`Cal.com booking failed (v2 and v1): ${bookingRes.status}`)
        }
      } else {
        // v2 succeeded
        const bookingData = await bookingRes.json()
        calcomBooking = bookingData?.booking || bookingData
        bookingUid = calcomBooking?.uid
        console.log('[BOOK] Cal.com v2 booking created:', { id: calcomBooking?.id, uid: bookingUid })
      }
      
      // Confirm the booking immediately
      if (bookingUid) {
        console.log('[BOOK] Confirming Cal.com v2 booking:', bookingUid)
        try {
          const confirmRes = await fetch(`https://api.cal.com/v2/bookings/${bookingUid}/confirm`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${project.calcomApiKey}`,
              'cal-api-version': '2024-08-12',
            },
          })
          if (confirmRes.ok) {
            console.log('[BOOK] Cal.com v2 booking confirmed successfully')
          } else {
            console.warn('[BOOK] Cal.com v2 confirm failed (may already be confirmed):', await confirmRes.text())
          }
        } catch (confirmErr: any) {
          console.warn('[BOOK] Cal.com v2 confirm error:', confirmErr.message)
        }
      }
    } catch (e: any) {
      await fetch(`${appUrl}/api/projects/${projectId}/bookings/${newBooking.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'failed' }),
      }).catch(() => {})
      return NextResponse.json({ result: "I couldn't confirm that slot just now. Let me offer a different time or connect you to the office.", error: e?.message || 'Cal.com failed' }, { status: 200 })
    }

    await fetch(`${appUrl}/api/projects/${projectId}/bookings/${newBooking.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'booked', calcomBookingId: calcomBooking?.id, calcomBookingUid: bookingUid })
    }).catch(() => {})

    const smsMessage = buildBookingConfirmationSMS(project.name, input.customerName, startTime, input.address, input.notes)
    await sendSMS({ to: input.customerPhone, message: smsMessage }).catch(() => {})
    await prisma.eventLog.create({ data: { projectId, type: 'booking.created', payload: { bookingId: newBooking.id, calcomBookingId: calcomBooking.id } } })

    return NextResponse.json({ result: `You are booked for ${startTime.toLocaleString()}. You'll receive a text confirmation.`, success: true })
  } catch (error: any) {
    console.error('[BOOK] ERROR:', error)
    console.error('[BOOK] Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    })
    const errorMsg = "I'm having trouble completing the booking right now. Let me transfer you to someone who can help get this scheduled."
    return NextResponse.json(
      { result: errorMsg, error: error.message || 'Failed to create booking' },
      { status: 200 } // Return 200 so Vapi can read the error message
    )
  }
}
export const runtime = 'nodejs'
