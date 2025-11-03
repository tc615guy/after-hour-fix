import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * Calculate fuel savings and drive time statistics for a project
 */

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
 * Get travel time using Google Distance Matrix API
 */
async function getTravelTime(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  apiKey: string,
  departureTime?: Date
): Promise<number | null> {
  try {
    const originStr = `${origin.lat},${origin.lng}`
    const destStr = `${destination.lat},${destination.lng}`
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', originStr)
    url.searchParams.set('destinations', destStr)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('units', 'imperial')
    
    if (departureTime && departureTime > new Date()) {
      url.searchParams.set('departure_time', Math.floor(departureTime.getTime() / 1000).toString())
    }
    
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === 'OK' && data.rows && data.rows.length > 0) {
      const element = data.rows[0].elements[0]
      if (element && element.status === 'OK') {
        return Math.ceil(element.duration.value / 60) // Return minutes
      }
    }

    return null
  } catch (error: any) {
    console.error('[Distance Matrix] Error:', error.message)
    return null
  }
}

/**
 * Calculate straight-line distance using Haversine formula (miles)
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
 * GET /api/projects/[id]/route-stats?days=7
 * Calculate fuel savings and drive time from smart routing
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const url = new URL(req.url)
    const days = parseInt(url.searchParams.get('days') || '7', 10)
    
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!googleApiKey) {
      return NextResponse.json({ 
        error: 'Google Maps API not configured',
        message: 'Smart routing metrics require Google Maps API key'
      }, { status: 400 })
    }

    // Get date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get all technicians
    const technicians = await prisma.technician.findMany({
      where: {
        projectId,
        isActive: true,
        deletedAt: null,
      },
    })

    // Get all bookings with technician assignments
    const bookings = await prisma.booking.findMany({
      where: {
        projectId,
        technicianId: { not: null },
        slotStart: { gte: startDate, lte: endDate },
        status: { in: ['booked', 'completed', 'en_route'] },
        deletedAt: null,
      },
      include: {
        technician: true,
      },
      orderBy: [
        { technicianId: 'asc' },
        { slotStart: 'asc' },
      ],
    })

    // Group bookings by technician
    const techBookings = new Map<string, typeof bookings>()
    for (const booking of bookings) {
      if (!booking.technicianId) continue
      const existing = techBookings.get(booking.technicianId) || []
      existing.push(booking)
      techBookings.set(booking.technicianId, existing)
    }

    let totalMilesActual = 0
    let totalMilesOptimal = 0
    let totalMinutesActual = 0
    let totalMinutesOptimal = 0
    let routesAnalyzed = 0

    // Calculate for each technician
    for (const tech of technicians) {
      const techBookingsList = techBookings.get(tech.id) || []
      if (techBookingsList.length < 2) continue // Need at least 2 stops for routing

      // Calculate actual route (as they were scheduled)
      let currentLocation = tech.address ? await geocodeAddress(tech.address, googleApiKey) : null
      let actualMiles = 0
      let actualMinutes = 0

      for (const booking of techBookingsList) {
        if (!booking.address) continue
        const dest = await geocodeAddress(booking.address, googleApiKey)
        if (!dest) continue

        if (currentLocation) {
          const miles = calculateDistance(currentLocation, dest)
          actualMiles += miles
          
          const travelTime = await getTravelTime(currentLocation, dest, googleApiKey, booking.slotStart || undefined)
          if (travelTime) {
            actualMinutes += travelTime
          }
        }
        currentLocation = dest
      }

      // Calculate optimal route (shortest path through all stops)
      // Simple heuristic: try a few route permutations and pick shortest
      const stops = techBookingsList.filter(b => b.address).length
      if (stops >= 2) {
        // For simplicity, use nearest-neighbor heuristic
        currentLocation = tech.address ? await geocodeAddress(tech.address, googleApiKey) : null
        const remaining = [...techBookingsList]
        let optimalMiles = 0
        let optimalMinutes = 0

        while (remaining.length > 0 && currentLocation) {
          // Find nearest unvisited stop
          let nearestDist = Infinity
          let nearestIdx = -1

          for (let i = 0; i < remaining.length; i++) {
            const b = remaining[i]
            if (!b.address) continue
            const dest = await geocodeAddress(b.address, googleApiKey)
            if (!dest) continue

            const dist = calculateDistance(currentLocation, dest)
            if (dist < nearestDist) {
              nearestDist = dist
              nearestIdx = i
            }
          }

          if (nearestIdx >= 0) {
            const nearest = remaining[nearestIdx]
            remaining.splice(nearestIdx, 1)
            
            const dest = await geocodeAddress(nearest.address!, googleApiKey)
            if (dest) {
              optimalMiles += nearestDist
              currentLocation = dest

              const travelTime = await getTravelTime(currentLocation, dest, googleApiKey, nearest.slotStart || undefined)
              if (travelTime) {
                optimalMinutes += travelTime
              }
            }
          } else {
            break
          }
        }

        totalMilesActual += actualMiles
        totalMilesOptimal += optimalMiles
        totalMinutesActual += actualMinutes
        totalMinutesOptimal += optimalMinutes
        routesAnalyzed++
      }
    }

    // Calculate savings
    const milesSaved = Math.max(0, totalMilesActual - totalMilesOptimal)
    const minutesSaved = Math.max(0, totalMinutesActual - totalMinutesOptimal)
    
    // Assume $0.50 per mile average fuel cost
    const fuelCostPerMile = 0.50
    const fuelSavings = milesSaved * fuelCostPerMile

    // Estimate hourly technician cost ($30/hour conservative)
    const hourlyRate = 30
    const timeSavings = (minutesSaved / 60) * hourlyRate

    return NextResponse.json({
      days,
      routesAnalyzed,
      metrics: {
        totalMilesActual: Math.round(totalMilesActual * 10) / 10,
        totalMilesOptimal: Math.round(totalMilesOptimal * 10) / 10,
        milesSaved: Math.round(milesSaved * 10) / 10,
        totalMinutesActual: Math.round(totalMinutesActual),
        totalMinutesOptimal: Math.round(totalMinutesOptimal),
        minutesSaved: Math.round(minutesSaved),
      },
      savings: {
        fuelSavings: Math.round(fuelSavings * 100) / 100,
        timeSavings: Math.round(timeSavings * 100) / 100,
        totalSavings: Math.round((fuelSavings + timeSavings) * 100) / 100,
      },
      assumptions: {
        fuelCostPerMile,
        hourlyRate,
      },
    })
  } catch (error: any) {
    console.error('[Route Stats] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to calculate route stats' }, { status: 500 })
  }
}

