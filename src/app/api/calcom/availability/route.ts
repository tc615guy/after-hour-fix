import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
    const eventTypeId = project.calcomEventTypeId
    if (!apiKey || !eventTypeId) {
      return NextResponse.json({ error: 'Cal.com not connected or event type missing' }, { status: 400 })
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

    // Call Cal.com v2 slots API
    console.log(`[Cal.com Availability] Querying v2 slots for projectId=${projectId}, eventTypeId=${eventTypeId}, start=${startIso}, end=${endIso}`)
    
    const slotsUrl = new URL('https://api.cal.com/v2/slots')
    slotsUrl.searchParams.set('eventTypeId', String(eventTypeId))
    slotsUrl.searchParams.set('start', startIso)
    slotsUrl.searchParams.set('end', endIso)
    slotsUrl.searchParams.set('timeZone', project.timezone)
    
    const resp = await fetch(slotsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'cal-api-version': '2024-06-11',
      },
    })

    if (!resp.ok) {
      const txt = await resp.text()
      console.error('[Cal.com Availability] v2 API error:', txt)
      return NextResponse.json({ error: 'Failed to fetch availability from Cal.com' }, { status: 500 })
    }

    const data = await resp.json()
    console.log('[Cal.com Availability] v2 API response:', JSON.stringify(data).substring(0, 500))
    
    // Cal.com v2 returns { slots: [{ startTime, endTime }] }
    const calcomSlots: Array<{ start: string; end?: string }> = []
    const slotsArray = data?.slots || []
    
    for (const slot of slotsArray) {
      const st = slot?.startTime || slot?.start
      const en = slot?.endTime || slot?.end
      if (st) {
        calcomSlots.push({ start: st, end: en })
      }
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
    return NextResponse.json({ success: true, slots: availableSlots })
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

