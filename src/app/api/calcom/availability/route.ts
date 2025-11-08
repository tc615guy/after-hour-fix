import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createCalComClient } from '@/lib/calcom'

// SMART ROUTING: Geocoding and distance calculation utilities
const googleApiKey = process.env.GOOGLE_MAPS_API_KEY

// Haversine formula for calculating distance between two coordinates (in miles)
function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
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

// Geocode an address to lat/lng coordinates
async function geocodeAddress(addressStr: string): Promise<{ lat: number; lng: number } | null> {
  if (!googleApiKey) return null
  try {
    const encoded = encodeURIComponent(addressStr)
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

// Get drive time between two addresses using Google Maps Distance Matrix API
async function getDriveTime(origin: string, destination: string): Promise<number | null> {
  if (!googleApiKey) return null
  try {
    const originEncoded = encodeURIComponent(origin)
    const destEncoded = encodeURIComponent(destination)
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originEncoded}&destinations=${destEncoded}&mode=driving&key=${googleApiKey}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === 'OK' && 
        data.rows && 
        data.rows.length > 0 && 
        data.rows[0].elements && 
        data.rows[0].elements.length > 0 &&
        data.rows[0].elements[0].status === 'OK') {
      // Duration is in seconds, convert to minutes
      const durationSeconds = data.rows[0].elements[0].duration.value
      return Math.ceil(durationSeconds / 60) // Round up to nearest minute
    }
    return null
  } catch (error) {
    console.error('[Availability] Drive time calculation error:', error)
    return null
  }
}

/**
 * GET/POST /api/calcom/availability?projectId=...&start=ISO&end=ISO
 * Returns available time slots for the project's Cal.com event type
 * Vapi server functions use POST, but we accept both
 */
async function handleAvailabilityRequest(req: NextRequest) {
  const startTime = Date.now()
  const decisionTrace: string[] = []
  
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId') || undefined
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')
    const isEmergency = url.searchParams.get('isEmergency') === 'true'
    const durationMinutes = parseInt(url.searchParams.get('durationMinutes') || '60', 10) // Default 60 min
    const serviceType = url.searchParams.get('serviceType') || undefined
    const customerAddress = url.searchParams.get('address') || undefined // SMART ROUTING: Customer address for proximity scoring
    
    decisionTrace.push(`Query: projectId=${projectId}, start=${start}, end=${end}, emergency=${isEmergency}, duration=${durationMinutes}min, service=${serviceType || 'any'}, address=${customerAddress || 'none'}`)
    
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const apiKey = project.calcomApiKey
    const calcomUser = project.calcomUser
    if (!apiKey || !calcomUser) {
      return NextResponse.json({ error: 'Cal.com not connected' }, { status: 400 })
    }
    
    // STRONG TIMEZONE HANDLING: Normalize everything to UTC internally
    const now = new Date()
    const tz = project.timezone || 'America/Chicago'
    // Get current hour in project timezone for business rules
    const currentHour = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }))
    decisionTrace.push(`Current time: ${now.toISOString()} (UTC), ${currentHour}:00 in ${tz}`)
    
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
    console.log(`[Cal.com Availability] Project "${project.name}" using Cal.com Event Type ID: ${project.calcomEventTypeId}`)
    
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
    
    // CRITICAL: Filter out slots that are in the past (for same-day bookings)
    // For emergencies, use minimal buffer (5 min). For routine, use larger buffer to prevent booking slots that just passed
    const bufferMinutes = isEmergency ? 5 : 30  // Emergencies need slots ASAP, routine can wait
    const nowWithBuffer = new Date(now.getTime() + bufferMinutes * 60 * 1000)
    const futureOnlyFiltered = businessHoursFiltered.filter(slot => {
      const slotTime = new Date(slot.start)
      return slotTime > nowWithBuffer
    })
    
    console.log(`[Cal.com Availability] After past-time filter: ${futureOnlyFiltered.length} slots (removed ${businessHoursFiltered.length - futureOnlyFiltered.length} past slots, cutoff: ${nowWithBuffer.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz })}, buffer: ${bufferMinutes}min${isEmergency ? ' [EMERGENCY]' : ''})`)

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
    
    // Log technician bookings for debugging (with duration + travel buffer)
    let totalBookings = 0
    for (const tech of technicians) {
      if (tech.bookings.length > 0) {
        totalBookings += tech.bookings.length
        console.log(`[Cal.com Availability] Tech ${tech.name} has ${tech.bookings.length} bookings in range`)
        tech.bookings.forEach(b => {
          if (!b.slotStart) return
          const startStr = new Date(b.slotStart).toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: project.timezone || 'America/Chicago',
          })
          
          // Calculate actual end time with travel buffer
          const bStart = new Date(b.slotStart).getTime()
          let bEnd = b.slotEnd ? new Date(b.slotEnd).getTime() : bStart + 90 * 60 * 1000
          const durationMin = Math.round((bEnd - bStart) / 60000)
          const bufferedEnd = new Date(bEnd + 30 * 60 * 1000) // Add 30 min travel buffer
          const bufferedEndStr = bufferedEnd.toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: project.timezone || 'America/Chicago',
          })
          
          console.log(`  - ${b.customerName}: ${startStr} (${durationMin} min) → blocked until ${bufferedEndStr} (includes 30 min travel buffer)`)
        })
      }
    }
    console.log(`[Cal.com Availability] Total bookings to check against: ${totalBookings}`)
    console.log(`[Cal.com Availability] Using 30-minute travel buffer between appointments`)

    // Filter slots to only those where at least one technician is free
    // OPTIMIZED: Return capacity + candidates (not assigned tech) to prevent race conditions
    // Use merged busy intervals per tech for O(log B) lookups instead of O(B) scans
    type BusyInterval = { start: number; end: number }
    type TechAvailability = { id: string; name: string; priority: number; busyIntervals: BusyInterval[] }
    
    // TRAVEL TIME BUFFER: Add 30 minutes between appointments for drive time
    const TRAVEL_BUFFER_MS = 30 * 60 * 1000 // 30 minutes
    
    // SMART ROUTING: Enhanced tech availability with location tracking
    type TechAvailabilityExtended = TechAvailability & {
      address: string | null // Home address
      bookingsWithAddress: Array<{ start: number; end: number; address: string }> // Bookings with service addresses
    }
    
    // Pre-merge each tech's busy intervals (sorted by start time) + track booking locations
    const techAvailability: TechAvailabilityExtended[] = technicians.map(tech => {
      const intervals: BusyInterval[] = []
      const bookingsWithAddress: Array<{ start: number; end: number; address: string }> = []
      
      for (const b of tech.bookings) {
        if (!b.slotStart) continue
        const bStart = new Date(b.slotStart).getTime()
        
        // Calculate end time:
        // 1. Use slotEnd if available
        // 2. Otherwise, use duration from booking (if specified)
        // 3. Otherwise, default to 90 minutes
        let bEnd: number
        if (b.slotEnd) {
          bEnd = new Date(b.slotEnd).getTime()
        } else {
          // Check if booking has duration specified in notes or duration field
          const durationMin = (b as any).duration || 90 // Default 90 min if not specified
          bEnd = bStart + durationMin * 60 * 1000
        }
        
        // CRITICAL: Add travel buffer AFTER the appointment ends
        // This prevents booking another appointment too soon after this one
        const bufferedEnd = bEnd + TRAVEL_BUFFER_MS
        
        intervals.push({ start: bStart, end: bufferedEnd })
        
        // SMART ROUTING: Track booking location for position calculation
        if (b.address) {
          bookingsWithAddress.push({ start: bStart, end: bEnd, address: b.address })
        }
      }
      
      // Merge overlapping intervals
      intervals.sort((a, b) => a.start - b.start)
      const merged: BusyInterval[] = []
      for (const interval of intervals) {
        if (merged.length === 0 || merged[merged.length - 1].end < interval.start) {
          merged.push(interval)
        } else {
          merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end)
        }
      }
      
      return {
        id: tech.id,
        name: tech.name,
        priority: tech.priority || 0,
        busyIntervals: merged,
        address: tech.address || null,
        bookingsWithAddress: bookingsWithAddress.sort((a, b) => a.start - b.start),
      }
    })
    
    // Helper: Binary search to check if slot overlaps any busy interval (O(log B))
    const isTechAvailable = (tech: TechAvailability, slotStart: number, slotEnd: number): boolean => {
      if (tech.busyIntervals.length === 0) return true
      // Binary search for first interval that could overlap
      let left = 0
      let right = tech.busyIntervals.length - 1
      while (left <= right) {
        const mid = Math.floor((left + right) / 2)
        const interval = tech.busyIntervals[mid]
        if (slotEnd <= interval.start) {
          right = mid - 1
        } else if (slotStart >= interval.end) {
          left = mid + 1
        } else {
          // Overlap found
          return false
        }
      }
      return true
    }
    
    // Build slots with capacity + candidates (sorted by priority)
    const availableSlots: Array<{ 
      start: string
      end?: string
      capacity: number
      candidates: string[] // Sorted by priority/load/proximity
    }> = []
    
    // Use requested duration (or default 60 min) instead of slot duration
    const requestedDurationMs = durationMinutes * 60 * 1000
    
    for (const slot of futureOnlyFiltered) {
      // Use requested duration, not slot duration
      const slotStart = new Date(slot.start).getTime()
      const slotEnd = slot.end ? new Date(slot.end).getTime() : slotStart + requestedDurationMs
      
      // Find available technicians (O(T log B) instead of O(T × B))
      const availableTechs: Array<{ id: string; priority: number }> = []
      for (const tech of techAvailability) {
        if (isTechAvailable(tech, slotStart, slotEnd)) {
          availableTechs.push({ id: tech.id, priority: tech.priority })
        }
      }
      
      // If at least one tech is available, include this slot
      if (availableTechs.length > 0) {
        // SMART ROUTING: If customer address provided, calculate proximity scores
        if (customerAddress && googleApiKey && availableTechs.length > 1) {
          console.log(`[Availability] SMART ROUTING: Calculating proximity for slot ${slot.start}`)
          
          // Geocode customer address once
          const customerCoords = await geocodeAddress(customerAddress)
          
          if (customerCoords) {
            // Calculate proximity score for each available tech
            const techsWithProximity: Array<{ id: string; priority: number; driveTimeMin: number | null; distance: number | null }> = []
            
            for (const techCandidate of availableTechs) {
              const techData = techAvailability.find(t => t.id === techCandidate.id)
              if (!techData) {
                techsWithProximity.push({ ...techCandidate, driveTimeMin: null, distance: null })
                continue
              }
              
              // CRITICAL: Determine tech's location at the start of this slot
              // BUSINESS HOURS LOGIC:
              // 1. Find the last booking BEFORE this slot (with cleanup buffer)
              // 2. If found: Tech is at that job location
              // 3. If NOT found AND it's the first booking of the day (slot is in morning): Tech is at home
              // 4. If NOT found AND it's during business hours (slot is afternoon/later): Skip this tech (no valid location)
              
              const CLEANUP_BUFFER_MIN = 20 // Time to wrap up and get ready for next job
              let techLocationAddress: string | null = null
              
              // Find last booking before this slot (with cleanup buffer)
              const slotStartWithBuffer = slotStart - (CLEANUP_BUFFER_MIN * 60 * 1000)
              const previousBookings = techData.bookingsWithAddress.filter(b => b.end <= slotStartWithBuffer)
              
              if (previousBookings.length > 0) {
                // Tech will be at their last job location
                const lastBooking = previousBookings[previousBookings.length - 1]
                techLocationAddress = lastBooking.address
                console.log(`[Availability]   Tech ${techData.name}: at job site (${lastBooking.address})`)
              } else {
                // No prior bookings - check if this is the first booking of the day
                const slotDate = new Date(slotStart)
                const slotHour = slotDate.getHours()
                
                // Only use home address if slot is in the morning (before 11 AM) - first job of day
                if (slotHour < 11) {
                  techLocationAddress = techData.address
                  console.log(`[Availability]   Tech ${techData.name}: at home - first job of day (${techData.address || 'no address'})`)
                } else {
                  // During business hours with no prior bookings: Can't determine location, skip this tech
                  console.log(`[Availability]   Tech ${techData.name}: SKIPPED - no prior bookings during business hours (can't determine location)`)
                  techLocationAddress = null
                }
              }
              
              // Calculate drive time from tech's location to customer
              let driveTimeMin: number | null = null
              let distance: number | null = null
              
              if (techLocationAddress) {
                // Try to get actual drive time from Google Maps
                driveTimeMin = await getDriveTime(techLocationAddress, customerAddress)
                
                // If drive time fails, fall back to straight-line distance
                if (!driveTimeMin) {
                  const techCoords = await geocodeAddress(techLocationAddress)
                  if (techCoords) {
                    distance = calculateDistance(techCoords, customerCoords)
                    // Estimate drive time: ~30 mph average in city (2 min per mile)
                    driveTimeMin = Math.ceil(distance * 2)
                  }
                }
                
                console.log(`[Availability]     → Drive time: ${driveTimeMin || 'unknown'} min, Distance: ${distance?.toFixed(1) || 'unknown'} mi`)
              }
              
              techsWithProximity.push({
                id: techCandidate.id,
                priority: techCandidate.priority,
                driveTimeMin,
                distance,
              })
            }
            
            // Sort by proximity (shortest drive time first), then priority, then ID
            techsWithProximity.sort((a, b) => {
              // Techs with known drive time come first
              if (a.driveTimeMin !== null && b.driveTimeMin === null) return -1
              if (a.driveTimeMin === null && b.driveTimeMin !== null) return 1
              
              // Both have drive time: sort by drive time (shortest first)
              if (a.driveTimeMin !== null && b.driveTimeMin !== null) {
                if (a.driveTimeMin !== b.driveTimeMin) return a.driveTimeMin - b.driveTimeMin
              }
              
              // Fall back to priority
              if (b.priority !== a.priority) return b.priority - a.priority
              
              // Finally, consistent ordering by ID
              return a.id.localeCompare(b.id)
            })
            
            console.log(`[Availability] SMART ROUTING: Sorted techs by proximity for slot ${slot.start}`)
            techsWithProximity.forEach((t, i) => {
              const techData = techAvailability.find(td => td.id === t.id)
              console.log(`[Availability]   ${i + 1}. ${techData?.name}: ${t.driveTimeMin || '?'} min drive`)
            })
            
            availableSlots.push({
              start: slot.start,
              end: slot.end || new Date(slotStart + requestedDurationMs).toISOString(),
              capacity: techsWithProximity.length,
              candidates: techsWithProximity.map(t => t.id), // Sorted by proximity!
            })
          } else {
            // Geocoding failed, fall back to priority-based sorting
            console.log(`[Availability] SMART ROUTING: Geocoding failed for ${customerAddress}, using priority`)
            availableTechs.sort((a, b) => {
              if (b.priority !== a.priority) return b.priority - a.priority
              return a.id.localeCompare(b.id)
            })
            
            availableSlots.push({
              start: slot.start,
              end: slot.end || new Date(slotStart + requestedDurationMs).toISOString(),
              capacity: availableTechs.length,
              candidates: availableTechs.map(t => t.id),
            })
          }
        } else {
          // No customer address or only one tech: use priority-based sorting
          availableTechs.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority
            return a.id.localeCompare(b.id)
          })
          
          availableSlots.push({
            start: slot.start,
            end: slot.end || new Date(slotStart + requestedDurationMs).toISOString(),
            capacity: availableTechs.length,
            candidates: availableTechs.map(t => t.id), // Sorted by priority
          })
        }
      } else {
        decisionTrace.push(`Slot ${slot.start} filtered: no available technicians`)
      }
    }
    
    decisionTrace.push(`Found ${availableSlots.length} available slots after filtering`)

    console.log(`[Cal.com Availability] Returning ${availableSlots.length} available slots (filtered from ${calcomSlots.length} Cal.com slots)`)
    
    // BUSINESS RULE: If it's after 4 PM in project timezone, filter out today's slots
    // (Unless it's an emergency, but AI will handle that separately)
    let filteredSlots = availableSlots
    if (currentHour >= 16 && !isEmergency) { // After 4 PM and not emergency
      // Get today's date in the project timezone (not UTC!)
      // toLocaleDateString returns MM/DD/YYYY, so we need to parse it correctly
      const dateParts = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        timeZone: tz 
      }).split('/') // [MM, DD, YYYY]
      const todayStr = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}` // YYYY-MM-DD
      
      console.log(`[Cal.com Availability] After 4 PM (${currentHour}:00) - filtering out slots for ${todayStr}`)
      
      // Filter availableSlots (not businessHoursFiltered) to preserve capacity/candidates
      filteredSlots = availableSlots.filter(slot => {
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
      decisionTrace.push(`After 4 PM filter: ${filteredSlots.length} slots remain (removed ${availableSlots.length - filteredSlots.length} today slots)`)
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
  
  // Build candidate tech names for first slot (for human-readable message)
  const firstSlotCandidates = limitedSlots[0]?.candidates || []
  const candidateNames = firstSlotCandidates
    .slice(0, 3) // Limit to first 3 for message
    .map(id => {
      const tech = technicians.find(t => t.id === id)
      return tech?.name || 'a technician'
    })
    .join(', ')
  const techInfo = firstSlotCandidates.length > 0 
    ? ` (${firstSlotCandidates.length} ${firstSlotCandidates.length === 1 ? 'technician' : 'technicians'} available${candidateNames ? `: ${candidateNames}` : ''})` 
    : ''
  const resultText = `SUCCESS: Found ${limitedSlots.length} available slots. The first available time is ${firstTime}${techInfo}. IMPORTANT: This is ${ampm} (${hourInTimezone >= 12 ? 'afternoon/evening' : 'morning'}), NOT ${ampm === 'AM' ? 'PM' : 'AM'}. Say to customer: "I can get someone out there at ${firstTime}. Does that work?"`
  
  // Machine-first, human-second API contract
  // OBSERVABILITY: Log decision trace and metrics
  const responseTime = Date.now() - startTime
  decisionTrace.push(`Response time: ${responseTime}ms`)
  
  const response = {
    success: true,
    query: {
      start: startIso,
      end: endIso,
      isEmergency: isEmergency || false,
      projectId: projectId,
      durationMinutes: durationMinutes,
      serviceType: serviceType || null,
    },
    slots: limitedSlots.map(slot => ({
      start: slot.start,
      end: slot.end,
      capacity: slot.capacity,
      candidates: slot.candidates,
    })),
    result: resultText, // Human-readable message for AI
    firstSlot: firstTime,
    totalSlots: limitedSlots.length,
    // Observability fields
    _metrics: {
      responseTimeMs: responseTime,
      slotsChecked: futureOnlyFiltered.length,
      slotsAvailable: availableSlots.length,
      techniciansChecked: technicians.length,
    },
    _trace: decisionTrace, // Decision trace for debugging (can be removed in production if needed)
  }

  console.log('[Cal.com Availability] FULL RESPONSE PAYLOAD:', JSON.stringify(response, null, 2))
  console.log('[Cal.com Availability] Decision trace:', decisionTrace.join(' | '))
  console.log('[Cal.com Availability] Metrics:', response._metrics)

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

