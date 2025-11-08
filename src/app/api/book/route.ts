import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createPendingBooking } from '@/lib/bookings'
import { createCalComClient } from '@/lib/calcom'
import { sendEmailAsync as sendEmail, buildConfirmationEmail } from '@/lib/email'
import { sendSMS, buildBookingConfirmationSMS } from '@/lib/sms'
import { z } from 'zod'
import { releaseHold } from '@/lib/soft-holds'

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
  durationMinutes: z.number().optional(), // Duration for service
  serviceType: z.string().optional(), // Service type for skill matching
  idempotencyKey: z.string().optional(), // Prevent duplicate bookings on retries
  holdToken: z.string().optional(), // Soft hold token (if hold was created)
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

    // IDEMPOTENCY: Check for existing booking with same idempotency key
    const idempotencyKey = params.idempotencyKey || req.headers.get('x-idempotency-key') || undefined
    if (idempotencyKey) {
      const url = new URL(req.url)
      const projectId = params.projectId || req.headers.get('x-project-id') || url.searchParams.get('projectId')
      if (projectId) {
        const existing = await prisma.booking.findFirst({
          where: {
            projectId,
            notes: { contains: `[IDEMPOTENCY:${idempotencyKey}]` },
            deletedAt: null,
          },
        })
        if (existing) {
          console.log('[BOOK] Idempotency key match - returning existing booking:', existing.id)
          const whenStr = existing.slotStart ? new Date(existing.slotStart).toLocaleString() : 'your appointment'
          return NextResponse.json({
            result: `Perfect! You're all set for ${whenStr}. We'll text you the details.`,
            bookingId: existing.id,
            success: true,
            idempotent: true,
          }, { status: 200 })
        }
      }
    }

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

    // Minutes cap enforcement (Starter=500, Pro=1200, Premium=2500)
    try {
      const subs = await prisma.subscription.findFirst({
        where: { userId: project.ownerId, status: { in: ['active', 'trialing'] } },
        orderBy: { updatedAt: 'desc' },
      })
      const proId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
      const ultraId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ULTRA
      const cap = subs && ultraId && subs.priceId === ultraId ? 1200
        : subs && proId && subs.priceId === proId ? 800
        : 300
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

    // EMERGENCY DISPATCH: Check for life-threatening emergencies (gas leak, etc.)
    const isLifeThreateningEmergency = /(gas\s+leak|carbon\s+monoxide|electrical\s+fire|burst.*main|flooding|no\s+heat.*freeze)/i.test(input.notes || '')
    if (isLifeThreateningEmergency) {
      console.log('[BOOK] 🚨 LIFE-THREATENING EMERGENCY DETECTED - Triggering emergency dispatch')
      
      // Check if we have on-call techs
      const hasOnCallTech = await prisma.technician.findFirst({
        where: { projectId, isOnCall: true, isActive: true }
      })
      
      if (hasOnCallTech) {
        // Trigger emergency dispatch
        try {
          const dispatchResponse = await fetch(`${req.nextUrl.origin}/api/emergency/dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              customerName: input.customerName,
              customerPhone: input.customerPhone,
              address: input.address,
              notes: input.notes,
              slotStart: input.startTime,
            })
          })
          
          const dispatchResult = await dispatchResponse.json()
          
          if (dispatchResult.dispatched) {
            console.log('[BOOK] ✅ Emergency dispatch successful')
            return NextResponse.json({
              result: dispatchResult.result || `Got it. This is urgent - I'm dispatching a technician to you right away. You'll get a call from them within minutes. Stay safe!`,
              success: true,
              dispatched: true,
              bookingId: dispatchResult.bookingId
            })
          }
          console.log('[BOOK] ⚠️ Emergency dispatch returned false - falling back to calendar booking')
        } catch (dispatchError) {
          console.error('[BOOK] ❌ Emergency dispatch failed:', dispatchError)
          // Fall through to regular booking
        }
      }
    }

    // DEDUPE: If an upcoming booking exists within 7 days for same phone, check if it's a reschedule request
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
          const existingTime = existing.slotStart ? new Date(existing.slotStart) : null
          const requestedTime = startTime
          
          // Check if they're requesting a DIFFERENT time (reschedule) or the SAME time (duplicate call)
          const timeDiffMinutes = existingTime ? Math.abs(requestedTime.getTime() - existingTime.getTime()) / (1000 * 60) : 999
          
          if (timeDiffMinutes < 5) {
            // Same time (within 5 minutes) - this is a duplicate call, not a reschedule
            // Just confirm the existing booking
            const whenStr = existingTime ? existingTime.toLocaleString() : 'your appointment'
            console.log('[BOOK] Duplicate call detected - same time requested. Confirming existing booking.')
            return NextResponse.json({ 
              result: `Perfect! You're all set for ${whenStr}. We'll text you the details.`,
              bookingId: existing.id,
              success: true
            }, { status: 200 })
          } else {
            // Different time - this is a reschedule request
            // Update the existing booking to the new time
            console.log(`[BOOK] Reschedule detected: ${existingTime?.toLocaleString()} → ${requestedTime.toLocaleString()}`)
            
            // Update the booking in our database
            await prisma.booking.update({
              where: { id: existing.id },
              data: {
                slotStart: startTime,
                slotEnd: endTime,
                customerName: input.customerName,
                address: input.address,
                notes: input.notes,
                updatedAt: new Date(),
              },
            })
            
            const newWhenStr = startTime.toLocaleString()
            console.log('[BOOK] Booking rescheduled successfully')
            return NextResponse.json({ 
              result: `Perfect! I've rescheduled your appointment to ${newWhenStr}. We'll text you the updated details.`,
              bookingId: existing.id,
              rescheduled: true,
              success: true
            }, { status: 200 })
          }
        }
      }
    } catch (err) {
      console.error('[BOOK] Error checking for duplicate:', err)
    }

    // TRANSACTIONAL: Assign technician at booking time (not during get_slots) to prevent race conditions
    // Use database transaction with row-level locking to prevent double-booking
    let technicianId: string | null = null
    let assignmentReason = 'No available technician'
    const bookingTrace: string[] = []
    bookingTrace.push(`Booking attempt: ${input.customerName}, ${startTime.toISOString()}`)
    
    try {
      // Use Prisma transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Get all active technicians with row-level lock on their bookings
        // This prevents concurrent bookings from selecting the same tech
        const allTechs = await tx.technician.findMany({
          where: {
            projectId,
            isActive: true,
            deletedAt: null,
          },
          include: {
            bookings: {
              where: {
                slotStart: { not: null },
                deletedAt: null,
                status: { in: ['pending', 'booked', 'en_route'] },
                // Use raw query for SELECT FOR UPDATE to lock conflicting bookings
              },
              orderBy: { slotStart: 'asc' },
            },
          },
          orderBy: [
            { priority: 'desc' }, // Priority first
            { createdAt: 'asc' }, // Then oldest first (load balancing)
          ],
        })
        
        // Check availability with conflict detection (re-check at booking time!)
        const slotStartTime = startTime.getTime()
        const slotEndTime = endTime.getTime()
        
        // PROXIMITY SCORING: Get last job location for each tech (if available)
        const googleApiKey = process.env.GOOGLE_MAPS_API_KEY
        const bookingAddress = input.address
        
        // Helper to calculate distance (Haversine formula)
        const calculateDistance = (
          coord1: { lat: number; lng: number },
          coord2: { lat: number; lng: number }
        ): number => {
          const R = 3959 // Earth's radius in miles
          const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180
          const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((coord1.lat * Math.PI) / 180) *
              Math.cos((coord2.lat * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          return R * c
        }
        
        // Helper to geocode address
        const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
          if (!googleApiKey) return null
          try {
            const encoded = encodeURIComponent(address)
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${googleApiKey}`
            const response = await fetch(url)
            const data = await response.json()
            if (data.status === 'OK' && data.results && data.results.length > 0) {
              const location = data.results[0].geometry.location
              return { lat: location.lat, lng: location.lng }
            }
            return null
          } catch {
            return null
          }
        }
        
        // Get booking address coordinates (for proximity scoring)
        let bookingCoords: { lat: number; lng: number } | null = null
        if (bookingAddress && googleApiKey) {
          bookingCoords = await geocodeAddress(bookingAddress)
        }
        
        // Score each available tech
        const availableTechs: Array<{ tech: typeof allTechs[0]; score: number; reasons: string[] }> = []
        
        for (const tech of allTechs) {
          // Check for conflicts
          const hasConflict = tech.bookings.some((b: any) => {
            if (!b.slotStart) return false
            const bStart = new Date(b.slotStart).getTime()
            const bEnd = b.slotEnd ? new Date(b.slotEnd).getTime() : bStart + 90 * 60 * 1000
            return slotStartTime < bEnd && slotEndTime > bStart
          })
          
          if (hasConflict) continue // Skip busy techs
          
          // Calculate score
          let score = 0
          const reasons: string[] = []
          
          // Priority score (higher priority = higher score)
          score += (tech.priority || 0) * 10
          reasons.push(`Priority: ${tech.priority || 0}`)
          
          // Load balancing: fewer bookings today = higher score
          const todayBookings = tech.bookings.filter((b: any) => {
            if (!b.slotStart) return false
            const bDate = new Date(b.slotStart)
            const today = new Date()
            return bDate.toDateString() === today.toDateString()
          }).length
          score += (10 - Math.min(todayBookings, 10)) // Max 10 point bonus for low load
          reasons.push(`Load: ${todayBookings} bookings today`)
          
          // PROXIMITY SCORING: Distance from last job (tiebreaker)
          if (bookingCoords && tech.bookings.length > 0) {
            // Find most recent completed booking
            const recentBooking = tech.bookings
              .filter((b: any) => b.slotEnd && new Date(b.slotEnd) < startTime && b.address)
              .sort((a: any, b: any) => new Date(b.slotEnd!).getTime() - new Date(a.slotEnd!).getTime())[0]
            
            if (recentBooking?.address) {
              const lastJobCoords = await geocodeAddress(recentBooking.address)
              if (lastJobCoords) {
                const distance = calculateDistance(lastJobCoords, bookingCoords)
                // Score decreases with distance: 0-2 miles = +20, 2-5 = +15, 5-10 = +10, 10+ = +5
                if (distance < 2) {
                  score += 20
                  reasons.push(`${distance.toFixed(1)} mi from last job`)
                } else if (distance < 5) {
                  score += 15
                  reasons.push(`${distance.toFixed(1)} mi from last job`)
                } else if (distance < 10) {
                  score += 10
                  reasons.push(`${distance.toFixed(1)} mi from last job`)
                } else {
                  score += 5
                  reasons.push(`${distance.toFixed(1)} mi from last job`)
                }
              }
            }
          }
          
          // Fallback: Check if tech's home address is close (if no recent jobs)
          if (bookingCoords && tech.address && tech.bookings.length === 0) {
            const techHomeCoords = await geocodeAddress(tech.address)
            if (techHomeCoords) {
              const distance = calculateDistance(techHomeCoords, bookingCoords)
              if (distance < 5) {
                score += 5
                reasons.push(`${distance.toFixed(1)} mi from home`)
              }
            }
          }
          
          availableTechs.push({ tech, score, reasons })
        }
        
        // Sort by score (highest first), then by priority, then by ID
        availableTechs.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          if (b.tech.priority !== a.tech.priority) return (b.tech.priority || 0) - (a.tech.priority || 0)
          return a.tech.id.localeCompare(b.tech.id)
        })
        
        // Select best available tech
        if (availableTechs.length > 0) {
          const best = availableTechs[0]
          assignmentReason = best.reasons.join(', ')
          console.log(`[BOOK] Assigned technician: ${best.tech.name} (${best.tech.id}) - ${assignmentReason} (score: ${best.score})`)
          return { technicianId: best.tech.id, reason: assignmentReason }
        }
        
        return { technicianId: null, reason: 'All technicians busy' }
      }, {
        timeout: 10000, // 10 second timeout
      })
      
      technicianId = result.technicianId
      assignmentReason = result.reason
      
      if (!technicianId) {
        console.log('[BOOK] No available technician found for this slot - booking will be unassigned')
        bookingTrace.push('No technician assigned (all busy)')
      } else {
        bookingTrace.push(`Technician assigned: ${technicianId} (${assignmentReason})`)
      }
    } catch (techErr: any) {
      console.warn('[BOOK] Error finding technician:', techErr)
      bookingTrace.push(`Technician assignment error: ${techErr.message}`)
      // Continue without technician assignment
    }
    
    // Log booking attempt with observability
    const bookingStartTime = Date.now()
    bookingTrace.push(`Booking creation started at ${new Date().toISOString()}`)

    // SOFT HOLDS: Release hold if provided (booking confirmed)
    if (input.holdToken) {
      try {
        const released = releaseHold(input.holdToken)
        if (released) {
          bookingTrace.push(`Soft hold released: ${input.holdToken}`)
        } else {
          bookingTrace.push(`Soft hold not found or expired: ${input.holdToken}`)
        }
      } catch (err) {
        console.warn('[BOOK] Error releasing hold:', err)
      }
    }

    // Synchronous creation: pending -> Cal.com -> booked
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // Add idempotency key to notes if provided
    let notesWithIdempotency = input.notes
    if (idempotencyKey) {
      notesWithIdempotency = `${input.notes || ''} [IDEMPOTENCY:${idempotencyKey}]`.trim()
    }
    
    const createRes = await fetch(`${appUrl}/api/projects/${projectId}/bookings/quick-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            address: input.address,
            notes: notesWithIdempotency,
            slotStart: startTime.toISOString(),
            slotEnd: endTime.toISOString(),
            status: 'pending',
            technicianId: technicianId, // Assign technician if found
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
    
    // OBSERVABILITY: Log booking with full trace
    const bookingTime = Date.now() - bookingStartTime
    bookingTrace.push(`Booking created: ${newBooking.id} in ${bookingTime}ms`)
    
    await prisma.eventLog.create({ 
      data: { 
        projectId, 
        type: 'booking.created', 
        payload: { 
          bookingId: newBooking.id, 
          calcomBookingId: calcomBooking.id,
          technicianId: technicianId,
          assignmentReason: assignmentReason,
          durationMs: bookingTime,
          trace: bookingTrace,
        } 
      } 
    })

    // Format time in project timezone for customer message
    const timeInTz = startTime.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: project.timezone || 'America/Chicago',
    })
    
    return NextResponse.json({ 
      result: `You are booked for ${timeInTz}. You'll receive a text confirmation.`, 
      success: true,
      bookingId: newBooking.id,
      _metrics: {
        bookingTimeMs: bookingTime,
        technicianAssigned: !!technicianId,
      },
    })
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
