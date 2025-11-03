import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/gaps?projectId=...&start=ISO&end=ISO
 * Find gaps in technician schedules and suggest best assignments
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId') || undefined
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')
    
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // Parse date range (default: today + next 7 days)
    const now = new Date()
    const startIso = start && !isNaN(new Date(start).getTime()) ? new Date(start).toISOString() : now.toISOString()
    const endDefault = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const endIso = end && !isNaN(new Date(end).getTime()) ? new Date(end).toISOString() : endDefault.toISOString()

    // Get all bookings in range
    const bookings = await prisma.booking.findMany({
      where: {
        projectId,
        slotStart: { gte: new Date(startIso), lte: new Date(endIso) },
        status: { in: ['pending', 'booked', 'en_route'] },
        deletedAt: null,
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: { slotStart: 'asc' },
    })

    // Get all active technicians
    const technicians = await prisma.technician.findMany({
      where: {
        projectId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        bookings: {
          where: {
            slotStart: { gte: new Date(startIso), lte: new Date(endIso) },
            status: { in: ['pending', 'booked', 'en_route'] },
            deletedAt: null,
          },
          orderBy: { slotStart: 'asc' },
        },
      },
    })

    // Build gaps array
    const gaps: Array<{
      unassignedBooking: any
      suggestedTechnician?: {
        id: string
        name: string
        reason: string
        distance?: string
      }
      conflictingTechnicians?: string[]
    }> = []

    // Find bookings without assigned technicians
    const unassigned = bookings.filter(b => !b.technicianId)
    
    for (const booking of unassigned) {
      const gap: any = { unassignedBooking: booking }
      
      // Find best technician for this booking
      const suggestions = []
      
      for (const tech of technicians) {
        let score = 0
        const reasons: string[] = []
        
        // Check if this technician has conflicts (overlapping bookings)
        const hasConflict = tech.bookings.some((b: any) => {
          const bStart = b.slotStart ? new Date(b.slotStart).getTime() : 0
          const bEnd = b.slotEnd ? new Date(b.slotEnd).getTime() : bStart + 60 * 60 * 1000
          const bookingStart = booking.slotStart ? new Date(booking.slotStart).getTime() : 0
          const bookingEnd = booking.slotEnd ? new Date(booking.slotEnd).getTime() : bookingStart + 60 * 60 * 1000
          
          return bookingStart < bEnd && bookingEnd > bStart
        })
        
        if (hasConflict) {
          reasons.push('Has overlapping appointment')
          continue // Skip this tech
        }
        
        // Check if technician has a booking immediately before this one
        const previousBooking = tech.bookings.findLast((b: any) => {
          const bEnd = b.slotEnd ? new Date(b.slotEnd).getTime() : 0
          const bookingStart = booking.slotStart ? new Date(booking.slotStart).getTime() : 0
          return bEnd > 0 && bEnd <= bookingStart
        })
        
        if (previousBooking?.address && booking.address) {
          const prevAddress = previousBooking.address
          const newAddress = booking.address
          // Simple address-based scoring (same area = better)
          const prevCity = prevAddress.split(',').slice(-2)[0]?.trim().toLowerCase()
          const newCity = newAddress.split(',').slice(-2)[0]?.trim().toLowerCase()
          if (prevCity && newCity && prevCity === newCity) {
            score += 50
            reasons.push(`Working in same area (${prevCity})`)
          }
        }
        
        // Check if technician is on-call (lower priority for non-emergencies)
        if (tech.isOnCall && booking.isEmergency) {
          score += 30
          reasons.push('Available for emergencies')
        } else if (tech.isOnCall) {
          score += 10
          reasons.push('On-call availability')
        }
        
        // Base score for any available technician
        score += 20
        reasons.push('Available for scheduling')
        
        suggestions.push({
          id: tech.id,
          name: tech.name,
          score,
          reasons,
        })
      }
      
      // Find best suggestion
      const best = suggestions.sort((a, b) => b.score - a.score)[0]
      if (best) {
        gap.suggestedTechnician = {
          id: best.id,
          name: best.name,
          reason: best.reasons.join(', '),
        }
      }
      
      // Find all techs with conflicts
      const conflicts = technicians
        .filter((tech: any) => tech.bookings.some((b: any) => {
          const bStart = b.slotStart ? new Date(b.slotStart).getTime() : 0
          const bEnd = b.slotEnd ? new Date(b.slotEnd).getTime() : bStart + 60 * 60 * 1000
          const bookingStart = booking.slotStart ? new Date(booking.slotStart).getTime() : 0
          const bookingEnd = booking.slotEnd ? new Date(booking.slotEnd).getTime() : bookingStart + 60 * 60 * 1000
          return bookingStart < bEnd && bookingEnd > bStart
        }))
        .map((tech: any) => tech.name)
      
      if (conflicts.length > 0) {
        gap.conflictingTechnicians = conflicts
      }
      
      gaps.push(gap)
    }

    return NextResponse.json({ success: true, gaps, summary: { total: gaps.length, technicians: technicians.length } })
  } catch (error: any) {
    console.error('[GAPS] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to find gaps' }, { status: 500 })
  }
}

