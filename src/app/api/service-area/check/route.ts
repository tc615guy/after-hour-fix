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
async function handleServiceAreaCheck(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { address } = z
      .object({
        address: z.string().min(3).optional(), // ✅ Make address optional
      })
      .parse(body)
    
    const projectId = normalizeProjectId(req)

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // If no address provided, skip the check and allow booking
    if (!address) {
      const msg = 'We service your area!'
      return NextResponse.json({
        result: msg,
        inServiceArea: true,
        message: msg,
      })
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

    // Helper function to extract city from address using multiple strategies
    const extractCity = async (addr: string): Promise<string | null> => {
      // Strategy 1: Extract from comma-separated format (e.g., "123 Main St, City, State" or "City, State")
      const cityParts = addr.split(',').map((s) => s.trim())
      if (cityParts.length > 1) {
        // If we have multiple parts, city is usually the second-to-last (before state)
        const potentialCity = cityParts[cityParts.length - 2]
        // Remove common state abbreviations and zip codes
        const cleanedCity = potentialCity.replace(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/gi, '').trim()
        if (cleanedCity && !cleanedCity.match(/^\d+$/)) {
          console.log(`[Service Area Check] Extracted city from comma format: "${cleanedCity}"`)
          return cleanedCity
        }
      }

      // Strategy 2: Try to find city name in the address (look for capitalized words that might be city names)
      // This is a fallback for addresses like "123 Main St Murfreesboro" or just "Murfreesboro"
      const words = addr.split(/\s+/)
      // Look for capitalized words (potential city names) that aren't street types or numbers
      const streetTypes = ['st', 'street', 'ave', 'avenue', 'rd', 'road', 'dr', 'drive', 'ln', 'lane', 'blvd', 'boulevard', 'ct', 'court', 'pl', 'place', 'way', 'cir', 'circle']
      for (let i = words.length - 1; i >= 0; i--) {
        const word = words[i].replace(/[^a-zA-Z]/g, '') // Remove punctuation
        if (word.length > 3 && word[0] === word[0].toUpperCase() && !streetTypes.includes(word.toLowerCase()) && !word.match(/^\d+$/)) {
          console.log(`[Service Area Check] Extracted potential city from word pattern: "${word}"`)
          return word
        }
      }

      // Strategy 3: Use Google Maps Geocoding API to extract city (most reliable)
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY
      if (googleApiKey) {
        try {
          const geocodeResult = await geocodeAddressForCity(addr, googleApiKey)
          if (geocodeResult) {
            console.log(`[Service Area Check] Extracted city from geocoding: "${geocodeResult}"`)
            return geocodeResult
          }
        } catch (e) {
          console.warn(`[Service Area Check] Geocoding for city extraction failed:`, e)
        }
      }

      return null
    }

    // Check service area type
    if (serviceArea?.type === 'zipcodes' && Array.isArray(serviceArea.value)) {
      const allowedZipCodes = serviceArea.value.map((z: any) => z.toString().padStart(5, '0'))
      console.log(`[Service Area Check] Checking zipcode: ${zipCode} against allowed: ${allowedZipCodes.join(', ')}`)
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
      const allowedCities = serviceArea.value.map((c: string) => c.toLowerCase().trim())
      console.log(`[Service Area Check] Checking address: "${address}" against allowed cities: ${allowedCities.join(', ')}`)
      
      // Extract city from address
      const city = await extractCity(address)
      console.log(`[Service Area Check] Extracted city: "${city}"`)
      
      if (city) {
        const cityLower = city.toLowerCase().trim()
        // Check for exact match
        if (allowedCities.includes(cityLower)) {
          const msg = `We service ${city}!`
          console.log(`[Service Area Check] ✅ City match found: "${city}"`)
          return NextResponse.json({
            result: msg,
            inServiceArea: true,
            message: msg,
          })
        }
        
        // Check for partial match (e.g., "Murfreesboro" matches "Murfreesboro, TN")
        const partialMatch = allowedCities.some(allowed => {
          const allowedBase = allowed.split(',')[0].trim().toLowerCase()
          return cityLower === allowedBase || cityLower.includes(allowedBase) || allowedBase.includes(cityLower)
        })
        
        if (partialMatch) {
          const msg = `We service ${city}!`
          console.log(`[Service Area Check] ✅ Partial city match found: "${city}"`)
          return NextResponse.json({
            result: msg,
            inServiceArea: true,
            message: msg,
          })
        }
      }
      
      const msg = `I'm sorry, we don't currently service ${city ? city : 'that area'}. We cover: ${serviceArea.value.slice(0, 5).join(', ')}${serviceArea.value.length > 5 ? ' and more' : ''}.`
      console.log(`[Service Area Check] ❌ City not in service area. Extracted: "${city}", Allowed: ${allowedCities.join(', ')}`)
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
 * Geocode an address and extract the city name from the results
 */
async function geocodeAddressForCity(address: string, apiKey: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(address)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0]
      // Extract city from address_components
      const addressComponents = result.address_components || []
      for (const component of addressComponents) {
        if (component.types.includes('locality')) {
          return component.long_name
        }
        // Fallback to administrative_area_level_2 (county) or administrative_area_level_3 if no locality
        if (component.types.includes('administrative_area_level_3')) {
          return component.long_name
        }
      }
    }

    return null
  } catch (error: any) {
    console.error('[Geocoding City] Error:', error.message)
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

// Handle both GET and POST (Vapi webhook calls with GET)
export async function GET(req: NextRequest) {
  return handleServiceAreaCheck(req)
}

export async function POST(req: NextRequest) {
  return handleServiceAreaCheck(req)
}

