import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * Check if a service address is within the configured service area
 * Uses zipcode/city matching or Google Maps Geocoding for radius-based validation
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, address } = z
      .object({
        projectId: z.string().min(1),
        address: z.string().min(3),
      })
      .parse(await req.json())

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const businessAddress = (project as any).businessAddress
    const serviceArea = (project as any).serviceArea as any
    const serviceRadius = (project as any).serviceRadius as number

    // If no service area is configured, allow all bookings
    if (!businessAddress && !serviceArea && !serviceRadius) {
      return NextResponse.json({
        inServiceArea: true,
        message: 'Service area not configured. All addresses accepted.',
      })
    }

    // Parse address components (basic - extracts zip code)
    const zipMatch = address.match(/\b\d{5}(?:-\d{4})?\b/)
    const zipCode = zipMatch ? zipMatch[0] : null

    // Parse city (rough extraction)
    const cityParts = address.split(',').map((s) => s.trim())
    const city = cityParts.length > 1 ? cityParts[cityParts.length - 2] : null

    // Check service area type
    if (serviceArea?.type === 'zipcodes' && Array.isArray(serviceArea.value)) {
      const allowedZipCodes = serviceArea.value.map((z: any) => z.toString().padStart(5, '0'))
      if (zipCode && allowedZipCodes.includes(zipCode)) {
        return NextResponse.json({
          inServiceArea: true,
          message: `We service ${zipCode}. I can help you book!`,
        })
      }
      return NextResponse.json({
        inServiceArea: false,
        message: `I'm sorry, we don't currently service ${zipCode ? zipCode : 'that area'}. We cover: ${serviceArea.value.slice(0, 5).join(', ')}${serviceArea.value.length > 5 ? ' and more' : ''}.`,
      })
    }

    if (serviceArea?.type === 'cities' && Array.isArray(serviceArea.value)) {
      const allowedCities = serviceArea.value.map((c: string) => c.toLowerCase())
      if (city && allowedCities.includes(city.toLowerCase())) {
        return NextResponse.json({
          inServiceArea: true,
          message: `We service ${city}. I can help you book!`,
        })
      }
      return NextResponse.json({
        inServiceArea: false,
        message: `I'm sorry, we don't currently service ${city ? city : 'that area'}. We cover: ${serviceArea.value.slice(0, 5).join(', ')}${serviceArea.value.length > 5 ? ' and more' : ''}.`,
      })
    }

    // For radius-based service area, use Google Maps Geocoding API
    if (serviceRadius && businessAddress) {
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY
      
      if (!googleApiKey) {
        // No API key configured - accept with warning
        console.warn(`[Service Area Check] No Google Maps API key configured for project ${projectId}`)
        return NextResponse.json({
          inServiceArea: true,
          message: `Address accepted. Please note the service radius is ${serviceRadius} miles from our business.`,
        })
      }

      try {
        // Geocode both addresses
        const [businessCoords, customerCoords] = await Promise.all([
          geocodeAddress(businessAddress, googleApiKey),
          geocodeAddress(address, googleApiKey),
        ])

        if (!businessCoords || !customerCoords) {
          // Geocoding failed - accept with warning
          console.warn(`[Service Area Check] Geocoding failed for project ${projectId}`)
          return NextResponse.json({
            inServiceArea: true,
            message: `Address accepted. Please note the service radius is ${serviceRadius} miles from our business.`,
          })
        }

        // Calculate distance using Haversine formula
        const distanceMiles = calculateDistance(businessCoords, customerCoords)

        if (distanceMiles <= serviceRadius) {
          return NextResponse.json({
            inServiceArea: true,
            message: `Perfect! You're within our ${serviceRadius}-mile service area (${distanceMiles.toFixed(1)} miles away). I can help you book!`,
            distanceMiles: Math.round(distanceMiles * 10) / 10,
          })
        } else {
          return NextResponse.json({
            inServiceArea: false,
            message: `I'm sorry, but you're ${distanceMiles.toFixed(1)} miles away, which is outside our ${serviceRadius}-mile service area. Is there another location closer to us where we could meet?`,
            distanceMiles: Math.round(distanceMiles * 10) / 10,
          })
        }
      } catch (geocodeError: any) {
        console.error('[Service Area Check] Geocoding error:', geocodeError.message)
        // On error, accept the booking but note it needs verification
        return NextResponse.json({
          inServiceArea: true,
          message: `Address accepted. Please note the service radius is ${serviceRadius} miles from our business.`,
        })
      }
    }

    // Default: accept if we can't determine
    return NextResponse.json({
      inServiceArea: true,
      message: 'Address accepted for booking.',
    })
  } catch (error: any) {
    console.error('[Service Area Check] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check service area' },
      { status: 500 }
    )
  }
}

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

