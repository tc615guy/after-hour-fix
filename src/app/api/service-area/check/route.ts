import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

function normalizeProjectId(req: NextRequest, bodyProjectId?: string) {
  const url = new URL(req.url)
  return (
    bodyProjectId ||
    url.searchParams.get('projectId') ||
    url.searchParams.get('project_id') ||
    url.pathname.split('/projects/')[1]?.split('/')[0] ||
    ''
  )
}

/**
 * Check if a service address is within the configured service area
 * Uses zipcode/city matching or Google Maps Geocoding for radius-based validation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { address } = z
      .object({
        address: z.string().min(3),
      })
      .parse(body)
    
    const projectId = normalizeProjectId(req)

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const businessAddress = (project as any).businessAddress
    const serviceArea = (project as any).serviceArea as any
    const serviceRadius = (project as any).serviceRadius as number

    // If no service area is configured, allow all bookings
    if (!businessAddress && !serviceArea && !serviceRadius) {
      const msg = 'We service your area!'
      return NextResponse.json({
        result: msg,
        inServiceArea: true,
        message: msg,
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
        const msg = `We service ${zipCode}!`
        return NextResponse.json({
          result: msg,
          inServiceArea: true,
          message: msg,
        })
      }
      const msg = `I'm sorry, we don't currently service ${zipCode ? zipCode : 'that area'}. We cover: ${serviceArea.value.slice(0, 5).join(', ')}${serviceArea.value.length > 5 ? ' and more' : ''}.`
      return NextResponse.json({
        result: msg,
        inServiceArea: false,
        message: msg,
      })
    }

    if (serviceArea?.type === 'cities' && Array.isArray(serviceArea.value)) {
      const allowedCities = serviceArea.value.map((c: string) => c.toLowerCase())
      if (city && allowedCities.includes(city.toLowerCase())) {
        const msg = `We service ${city}!`
        return NextResponse.json({
          result: msg,
          inServiceArea: true,
          message: msg,
        })
      }
      const msg = `I'm sorry, we don't currently service ${city ? city : 'that area'}. We cover: ${serviceArea.value.slice(0, 5).join(', ')}${serviceArea.value.length > 5 ? ' and more' : ''}.`
      return NextResponse.json({
        result: msg,
        inServiceArea: false,
        message: msg,
      })
    }

    // For radius-based service area, use Google Maps Geocoding API
    if (serviceRadius && businessAddress) {
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY
      
      if (!googleApiKey) {
        // No API key configured - accept with warning
        console.warn(`[Service Area Check] No Google Maps API key configured for project ${projectId}`)
        const msg = `We service your area!`
        return NextResponse.json({
          result: msg,
          inServiceArea: true,
          message: `Address accepted. Service radius is ${serviceRadius} miles.`,
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
          const msg = `We service your area!`
          return NextResponse.json({
            result: msg,
            inServiceArea: true,
            message: `Address accepted. Service radius is ${serviceRadius} miles.`,
          })
        }

        // Calculate distance using Haversine formula
        const distanceMiles = calculateDistance(businessCoords, customerCoords)

        if (distanceMiles <= serviceRadius) {
          const msg = `Perfect! You're within our service area, only ${distanceMiles.toFixed(1)} miles away.`
          return NextResponse.json({
            result: msg,
            inServiceArea: true,
            message: msg,
            distanceMiles: Math.round(distanceMiles * 10) / 10,
          })
        } else {
          const msg = `I'm sorry, but you're ${distanceMiles.toFixed(1)} miles away, which is outside our ${serviceRadius}-mile service area.`
          return NextResponse.json({
            result: msg,
            inServiceArea: false,
            message: msg,
            distanceMiles: Math.round(distanceMiles * 10) / 10,
          })
        }
      } catch (geocodeError: any) {
        console.error('[Service Area Check] Geocoding error:', geocodeError.message)
        // On error, accept the booking but note it needs verification
        const msg = `We service your area!`
        return NextResponse.json({
          result: msg,
          inServiceArea: true,
          message: `Address accepted. Service radius is ${serviceRadius} miles.`,
        })
      }
    }

    // Default: accept if we can't determine
    const msg = 'We service your area!'
    return NextResponse.json({
      result: msg,
      inServiceArea: true,
      message: msg,
    })
  } catch (error: any) {
    console.error('[Service Area Check] Error:', error)
    return NextResponse.json(
      { result: error.message || 'Error checking service area', error: error.message || 'Failed to check service area' },
      { status: 200 }
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

