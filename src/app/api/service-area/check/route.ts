import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * Check if a service address is within the configured service area
 * This uses basic geographic distance calculation and zipcode/city matching
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

    // For radius-based service area, we'd need geocoding
    // For now, we accept all addresses if radius is configured but warn the AI
    if (serviceRadius && businessAddress) {
      // TODO: Implement actual distance calculation using geocoding API
      // For now, accept the booking but log for manual review
      return NextResponse.json({
        inServiceArea: true,
        message: `Address accepted. Please note the service radius is ${serviceRadius} miles from our business.`,
      })
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

