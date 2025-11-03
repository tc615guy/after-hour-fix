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
    // Default: next 7 days
    const now = new Date()
    const startDate = start && !isNaN(new Date(start).getTime()) ? new Date(start) : now
    const endDefault = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const endDate = end && !isNaN(new Date(end).getTime()) ? new Date(end) : endDefault
    
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()

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

    // SMART ROUTING: Filter slots to only include those where at least one technician is available
    // Get all active technicians and their bookings in the time range
    const technicians = await prisma.technician.findMany({
      where: { projectId, isActive: true, deletedAt: null },
      include: {
        bookings: {
          where: {
            slotStart: { gte: new Date(startIso), lte: new Date(endIso) },
            status: { in: ['pending', 'booked', 'en_route'] },
            deletedAt: null,
          },
        },
      },
    })

    console.log(`[Cal.com Availability] Checking availability against ${technicians.length} technicians`)

    // Filter slots to only those where at least one technician is free
    const availableSlots: Array<{ start: string; end?: string }> = []
    for (const slot of calcomSlots) {
      const slotStart = new Date(slot.start)
      const slotEnd = slot.end ? new Date(slot.end) : new Date(slotStart.getTime() + 60 * 60 * 1000) // Default 1 hour
      
      // Check if any technician is available for this slot
      let hasAvailableTech = false
      for (const tech of technicians) {
        const isConflicted = tech.bookings.some((b) => {
          if (!b.slotStart) return false
          const bStart = new Date(b.slotStart)
          const bEnd = b.slotEnd ? new Date(b.slotEnd) : new Date(bStart.getTime() + 60 * 60 * 1000)
          // Check for overlap
          return slotStart < bEnd && slotEnd > bStart
        })
        
        if (!isConflicted) {
          hasAvailableTech = true
          break
        }
      }
      
      if (hasAvailableTech) {
        availableSlots.push(slot)
      }
    }

    console.log(`[Cal.com Availability] Returning ${availableSlots.length} available slots (filtered from ${calcomSlots.length} Cal.com slots)`)

    // Limit to first 20 slots to avoid overwhelming the AI with too many options
    const limitedSlots = availableSlots.slice(0, 20)
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

  const response = {
    result: `Available times: ${slotTimes.slice(0, 5).join(', ')}${slotTimes.length > 5 ? `, and ${slotTimes.length - 5} more slots` : ''}`,
    slots: limitedSlots
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

