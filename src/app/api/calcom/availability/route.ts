import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createCalComClient } from '@/lib/calcom'

/**
 * GET/POST /api/calcom/availability?projectId=...&start=ISO&end=ISO
 * Returns available time slots for the project's Cal.com event type
 * Vapi server functions use POST, but we accept both
 */
async function handleAvailabilityRequest(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId') || undefined
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const apiKey = project.calcomApiKey
    const calcomUser = project.calcomUser
    if (!apiKey || !calcomUser) {
      return NextResponse.json({ error: 'Cal.com not connected' }, { status: 400 })
    }

    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')
    const isEmergency = url.searchParams.get('isEmergency') === 'true'
    
    const now = new Date()
    const tz = project.timezone || 'America/Chicago'
    const currentHour = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }))
    
    // SMART DATE RANGE: Only query what we need
    let startDate: Date
    let endDate: Date
    
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    if (start && !isNaN(new Date(start).getTime())) {
      // Explicit start date provided
      startDate = new Date(start)
    } else if (isEmergency) {
      // Emergency: Start from now
      startDate = now
    } else {
      // Routine: Next business day (or later today if it's early morning)
      // If it's before 2 PM, check if there are openings later today
      // Otherwise, default to tomorrow
      startDate = currentHour < 14 ? now : tomorrow
    }
    
    if (end && !isNaN(new Date(end).getTime())) {
      endDate = new Date(end)
    } else if (isEmergency) {
      // Emergency: Only today
      endDate = new Date(now)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Routine: Only query the next business day (not 7 days!)
      // If we're checking today (early morning), end at end of today
      // Otherwise, end at end of tomorrow
      if (currentHour < 14 && startDate.getTime() < tomorrow.getTime()) {
        // Checking today
        endDate = new Date(now)
        endDate.setHours(23, 59, 59, 999)
      } else {
        // Checking tomorrow
        endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)
      }
    }
    
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()
    
    console.log(`[Cal.com Availability] Smart date range - Emergency: ${isEmergency}, Start: ${startIso}, End: ${endIso}, Current hour: ${currentHour}`)

    // Try Cal.com v2 slots API first, fallback to v1 via CalComClient
    console.log(`[Cal.com Availability] Querying v2 slots for projectId=${projectId}, eventTypeId=${project.calcomEventTypeId}, start=${startIso}, end=${endIso}`)
    
    let calcomSlots: Array<{ start: string; end?: string }> = []
    
    // Try v2 API first
    if (project.calcomEventTypeId) {
      try {
        const slotsUrl = new URL('https://api.cal.com/v2/slots/available')
        slotsUrl.searchParams.set('eventTypeId', String(project.calcomEventTypeId))
        slotsUrl.searchParams.set('startTime', startIso)
        slotsUrl.searchParams.set('endTime', endIso)
        
        const resp = await fetch(slotsUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'cal-api-version': '2024-08-12',
            'Content-Type': 'application/json',
          },
        })

        if (resp.ok) {
          const data = await resp.json()
          console.log('[Cal.com Availability] v2 API response:', JSON.stringify(data).substring(0, 500))
          
          // Cal.com v2 returns { data: { slots: { "2025-11-03": [{time: "..."}, ...] } } }
          const daySlots = data?.data?.slots || {}
          for (const dateKey in daySlots) {
            const slotsForDay = daySlots[dateKey] || []
            for (const slot of slotsForDay) {
              // v2 uses "time" not "start"
              const st = slot?.time || slot?.start
              if (st) {
                // Default duration to 1 hour if no end time
                const en = slot?.end || null
                calcomSlots.push({ start: st, end: en })
              }
            }
          }
          console.log(`[Cal.com Availability] Parsed ${calcomSlots.length} slots from v2 response`)
        } else {
          const txt = await resp.text()
          console.log(`[Cal.com Availability] v2 failed (${resp.status}): ${txt.substring(0, 200)}`)
        }
      } catch (v2Error: any) {
        console.log(`[Cal.com Availability] v2 error: ${v2Error.message}`)
      }
    }
    
    // Fallback to v1 if v2 failed or returned no slots
    if (calcomSlots.length === 0) {
      console.log('[Cal.com Availability] Falling back to v1 via CalComClient')
      const calcomClient = createCalComClient(apiKey)
      const fromDate = startIso.split('T')[0]
      const toDate = endIso.split('T')[0]
      calcomSlots = await calcomClient.getAvailability(calcomUser, fromDate, toDate)
    }
    
    console.log(`[Cal.com Availability] Found ${calcomSlots.length} slots from Cal.com`)
    
    // BUSINESS HOURS FILTER FIRST (before checking technician conflicts - much faster!)
    // Read from project.businessHours to respect actual operating hours
    const businessHours: any = project.businessHours || {}
    
    // Determine earliest open and latest close across all days
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    let earliestOpen = 24
    let latestClose = 0
    
    for (const day of days) {
      const dayConfig = businessHours[day]
      if (dayConfig?.enabled) {
        const openHour = parseInt((dayConfig.open || '08:00').split(':')[0])
        const closeHour = parseInt((dayConfig.close || '17:00').split(':')[0])
        earliestOpen = Math.min(earliestOpen, openHour)
        latestClose = Math.max(latestClose, closeHour)
      }
    }
    
    // Default to 8 AM - 5 PM if no business hours configured
    if (earliestOpen === 24) earliestOpen = 8
    if (latestClose === 0) latestClose = 17
    
    console.log(`[Cal.com Availability] Business hours filter: ${earliestOpen}:00 - ${latestClose}:00 in ${tz}`)
    
    // Filter by business hours FIRST (reduces slots to check significantly)
    const businessHoursFiltered = calcomSlots.filter(slot => {
      const slotTime = new Date(slot.start)
      // Get hour in project timezone, not UTC
      const hour = parseInt(slotTime.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }))
      return hour >= earliestOpen && hour < latestClose
    })
    
    console.log(`[Cal.com Availability] After business hours filter: ${businessHoursFiltered.length} slots (from ${calcomSlots.length})`)

    // SMART ROUTING: Filter slots to only include those where at least one technician is available
    // Get all active technicians and their bookings that could overlap with our time range
    // Note: startDate and endDate are already defined above from query params
    
    // OPTIMIZED: Only fetch bookings for the specific day(s) we're querying
    // This dramatically reduces the number of bookings to check
    const dayStart = new Date(startDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(endDate)
    dayEnd.setHours(23, 59, 59, 999)
    
    const technicians = await prisma.technician.findMany({
      where: { projectId, isActive: true, deletedAt: null },
      include: {
        bookings: {
          where: {
            // OPTIMIZED: Only fetch bookings for the specific day range we're checking
            // This is much faster than querying 7 days worth of bookings
            AND: [
              { slotStart: { not: null } },
              { slotStart: { gte: dayStart } }, // Only bookings on or after our start day
              { slotStart: { lte: dayEnd } },   // Only bookings on or before our end day
              // Exclude only canceled/failed bookings - include ALL other statuses (including 'TN' from CSV imports)
              { status: { notIn: ['canceled', 'failed'] } },
            ],
            deletedAt: null,
          },
        },
      },
    })

    console.log(`[Cal.com Availability] Checking availability against ${technicians.length} technicians`)
    console.log(`[Cal.com Availability] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)
    
    // Log technician bookings for debugging
    let totalBookings = 0
    for (const tech of technicians) {
      if (tech.bookings.length > 0) {
        totalBookings += tech.bookings.length
        console.log(`[Cal.com Availability] Tech ${tech.name} has ${tech.bookings.length} bookings in range`)
        tech.bookings.forEach(b => {
          const startStr = b.slotStart ? new Date(b.slotStart).toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: project.timezone || 'America/Chicago',
          }) : 'NO START'
          console.log(`  - ${b.customerName}: ${startStr} (${b.slotStart?.toISOString()})`)
        })
      }
    }
    console.log(`[Cal.com Availability] Total bookings to check against: ${totalBookings}`)

    // Filter slots to only those where at least one technician is free
    // Use businessHoursFiltered instead of calcomSlots (already filtered)
    const availableSlots: Array<{ start: string; end?: string }> = []
    for (const slot of businessHoursFiltered) {
      const slotStart = new Date(slot.start)
      const slotEnd = slot.end ? new Date(slot.end) : new Date(slotStart.getTime() + 30 * 60 * 1000) // Default 30 min for Cal.com slots
      
      // Check if any technician is available for this slot
      let hasAvailableTech = false
      const conflicts: Array<{ tech: string; booking: string; start: Date; end: Date }> = []
      
      for (const tech of technicians) {
        let techIsBusy = false
        for (const b of tech.bookings) {
          if (!b.slotStart) continue
          const bStart = new Date(b.slotStart)
          const bEnd = b.slotEnd ? new Date(b.slotEnd) : new Date(bStart.getTime() + 90 * 60 * 1000) // Default 1.5 hours
          
          // Check for overlap: slot overlaps booking if slot_start < booking_end AND slot_end > booking_start
          const overlaps = slotStart < bEnd && slotEnd > bStart
          
          if (overlaps) {
            techIsBusy = true
            conflicts.push({
              tech: tech.name,
              booking: b.customerName || 'Unknown',
              start: bStart,
              end: bEnd,
            })
            break // This tech is busy, no need to check other bookings
          }
        }
        
        if (!techIsBusy) {
          hasAvailableTech = true
          break // At least one tech is free, slot is available
        }
      }
      
      if (hasAvailableTech) {
        availableSlots.push(slot)
      } else {
        // Log why this slot was filtered out with detailed conflict info
        const slotTimeStr = slotStart.toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: project.timezone || 'America/Chicago',
        })
        console.log(`[Cal.com Availability] Filtered out ${slotTimeStr} (${slot.start}) - all ${technicians.length} techs are busy:`)
        conflicts.forEach(c => {
          const conflictTimeStr = c.start.toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: project.timezone || 'America/Chicago',
          })
          console.log(`  - ${c.tech} busy with ${c.booking} (${conflictTimeStr})`)
        })
      }
    }

    console.log(`[Cal.com Availability] Returning ${availableSlots.length} available slots (filtered from ${calcomSlots.length} Cal.com slots)`)
    
    // BUSINESS RULE: If it's after 4 PM in project timezone, filter out today's slots
    // (Unless it's an emergency, but AI will handle that separately)
    let filteredSlots = availableSlots
    if (currentHour >= 16 && !isEmergency) { // After 4 PM and not emergency
      // Get today's date in the project timezone (not UTC!)
      // toLocaleDateString returns MM/DD/YYYY, so we need to parse it correctly
      const dateParts = currentTime.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        timeZone: tz 
      }).split('/') // [MM, DD, YYYY]
      const todayStr = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}` // YYYY-MM-DD
      
      console.log(`[Cal.com Availability] After 4 PM (${currentHour}:00) - filtering out slots for ${todayStr}`)
      
      filteredSlots = businessHoursFiltered.filter(slot => {
        // Convert slot time to project timezone date string
        const slotParts = new Date(slot.start).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: tz
        }).split('/') // [MM, DD, YYYY]
        const slotDate = `${slotParts[2]}-${slotParts[0]}-${slotParts[1]}` // YYYY-MM-DD
        
        return slotDate !== todayStr // Exclude today's slots
      })
      console.log(`[Cal.com Availability] Filtered out today's slots. ${filteredSlots.length} slots remain`)
    }

    // Limit to first 20 slots to avoid overwhelming the AI with too many options
    const limitedSlots = filteredSlots.slice(0, 20)
    console.log(`[Cal.com Availability] Limiting response to ${limitedSlots.length} slots for AI processing`)

  // Return format that Vapi AI can read
  // Vapi needs a result field with a human-readable message
  const slotTimes = limitedSlots.map(s => {
    const dt = new Date(s.start)
    return dt.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: project.timezone || 'America/Chicago'
    })
  })

  // Vapi expects a "result" field with human-readable text for the AI
  // Make it VERY explicit - tell the AI exactly what to say
  // CRITICAL: Format time with explicit AM/PM to prevent AI from confusing 3 AM with 3 PM
  const firstSlot = limitedSlots[0]
  const firstSlotDate = new Date(firstSlot.start)
  const firstTime = firstSlotDate.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true, // Explicitly enable 12-hour format with AM/PM
    timeZone: project.timezone || 'America/Chicago'
  })
  
  // Double-check: Extract hour in PROJECT TIMEZONE to verify AM/PM
  // CRITICAL: getHours() returns UTC, we need the hour in the project timezone!
  const hourInTimezone = parseInt(firstSlotDate.toLocaleString('en-US', { 
    hour: 'numeric', 
    hour12: false, 
    timeZone: project.timezone || 'America/Chicago' 
  }))
  const ampm = hourInTimezone >= 12 ? 'PM' : 'AM'
  const displayHour = hourInTimezone % 12 || 12
  const minute = firstSlotDate.getMinutes().toString().padStart(2, '0')
  const explicitTime = `${displayHour}:${minute} ${ampm}`
  
  console.log(`[Cal.com Availability] First slot time verification: ${firstTime} (explicit: ${explicitTime}, hour in ${tz}: ${hourInTimezone})`)
  
  const resultText = `SUCCESS: Found ${limitedSlots.length} available slots. The first available time is ${firstTime}. IMPORTANT: This is ${ampm} (${hourInTimezone >= 12 ? 'afternoon/evening' : 'morning'}), NOT ${ampm === 'AM' ? 'PM' : 'AM'}. Say to customer: "I can get someone out there at ${firstTime}. Does that work?"`
  
  const response = {
    result: resultText,
    slots: limitedSlots,
    firstSlot: firstTime,
    totalSlots: limitedSlots.length,
    success: true
  }

  console.log('[Cal.com Availability] FULL RESPONSE PAYLOAD:', JSON.stringify(response, null, 2))
  console.log('[Cal.com Availability] Response keys:', Object.keys(response))
  console.log('[Cal.com Availability] Result field type:', typeof response.result)
  console.log('[Cal.com Availability] Result field value:', response.result)

  return NextResponse.json(response)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get availability' }, { status: 500 })
  }
}

// Handle both GET and POST (Vapi uses POST for server functions)
export async function GET(req: NextRequest) {
  return handleAvailabilityRequest(req)
}

export async function POST(req: NextRequest) {
  return handleAvailabilityRequest(req)
}

