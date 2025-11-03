import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Geocode an address using Google Maps Geocoding API
 */
async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location
      return { lat: location.lat, lng: location.lng }
    }

    console.warn('[Geocoding] No results for address:', address, data.status)
    return null
  } catch (error: any) {
    console.error('[Geocoding] Error:', error.message)
    return null
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
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

    // Get Google Maps API key if available
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY

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
      
      // Calculate duration for this booking
      let bookingDuration = 60 // default
      if (booking.slotStart && booking.slotEnd) {
        const diffMs = new Date(booking.slotEnd).getTime() - new Date(booking.slotStart).getTime()
        bookingDuration = Math.max(60, Math.round(diffMs / 60000))
      }
      
      // Find best technician for this booking
      const suggestions = []
      
      for (const tech of technicians) {
        let score = 0
        const reasons: string[] = []
        
        // Check if this technician has conflicts (overlapping bookings)
        const hasConflict = tech.bookings.some((b: any) => {
          const bStart = b.slotStart ? new Date(b.slotStart).getTime() : 0
          const bEnd = b.slotEnd ? new Date(b.slotEnd).getTime() : (bStart || Date.now()) + 60 * 60 * 1000
          const bookingStart = booking.slotStart ? new Date(booking.slotStart).getTime() : 0
          const bookingEnd = booking.slotEnd ? new Date(booking.slotEnd).getTime() : (bookingStart || Date.now()) + bookingDuration * 60 * 1000
          
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
        
        // Calculate distance-based scoring if we have addresses and Google API
        if (previousBooking?.address && booking.address && googleApiKey) {
          try {
            const prevCoords = await geocodeAddress(previousBooking.address, googleApiKey)
            const newCoords = await geocodeAddress(booking.address, googleApiKey)
            
            if (prevCoords && newCoords) {
              const distance = calculateDistance(prevCoords, newCoords)
              // Score decreases with distance: 0-2 miles = +100, 2-5 = +75, 5-10 = +50, 10+ = +25
              if (distance < 2) {
                score += 100
                reasons.push(`${distance.toFixed(1)} miles away (very close)`)
              } else if (distance < 5) {
                score += 75
                reasons.push(`${distance.toFixed(1)} miles away (nearby)`)
              } else if (distance < 10) {
                score += 50
                reasons.push(`${distance.toFixed(1)} miles away`)
              } else {
                score += 25
                reasons.push(`${distance.toFixed(1)} miles away`)
              }
            }
          } catch (err) {
            // Geocoding failed, fall back to city matching
          }
        }
        
        // Fallback: Simple city-based scoring if no distance calculation
        if (!reasons.some(r => r.includes('miles')) && previousBooking?.address && booking.address) {
          const prevAddress = previousBooking.address
          const newAddress = booking.address
          const prevCity = prevAddress.split(',').slice(-2)[0]?.trim().toLowerCase()
          const newCity = newAddress.split(',').slice(-2)[0]?.trim().toLowerCase()
          if (prevCity && newCity && prevCity === newCity) {
            score += 50
            reasons.push(`Same city (${prevCity})`)
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
          const bEnd = b.slotEnd ? new Date(b.slotEnd).getTime() : (bStart || Date.now()) + 60 * 60 * 1000
          const bookingStart = booking.slotStart ? new Date(booking.slotStart).getTime() : 0
          const bookingEnd = booking.slotEnd ? new Date(booking.slotEnd).getTime() : (bookingStart || Date.now()) + bookingDuration * 60 * 1000
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

