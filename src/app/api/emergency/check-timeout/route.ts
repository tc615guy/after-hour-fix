import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSMS, makePhoneCall } from '@/lib/sms'

/**
 * Check for unacknowledged emergency dispatches and escalate if needed
 * This can be called by a cron job or scheduled task
 * 
 * Logic:
 * - Find emergency bookings that are still 'pending' after 5 minutes
 * - If tech hasn't acknowledged (status not 'en_route'), escalate to next tech or notify manager
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, timeoutMinutes = 5 } = await req.json().catch(() => ({ timeoutMinutes: 5 }))

    const timeoutMs = timeoutMinutes * 60 * 1000
    const cutoffTime = new Date(Date.now() - timeoutMs)

    // Find unacknowledged emergency dispatches
    const unacknowledged = await prisma.booking.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        isEmergency: true,
        status: 'pending',
        createdAt: {
          lte: cutoffTime, // Created more than timeoutMinutes ago
        },
        deletedAt: null,
        technicianId: { not: null }, // Has assigned technician
      },
      include: {
        technician: true,
        project: true,
      },
    })

    console.log(`[Emergency Timeout Check] Found ${unacknowledged.length} unacknowledged emergency dispatches`)

    const results = []

    for (const booking of unacknowledged) {
      if (!booking.technician || !booking.address) continue

      // Get all available backup techs (exclude the original tech)
      const availableBackupTechs = await prisma.technician.findMany({
        where: {
          projectId: booking.projectId,
          isActive: true,
          isOnCall: true,
          id: { not: booking.technicianId },
        },
        orderBy: { priority: 'desc' },
      })

      if (availableBackupTechs.length === 0) {
        // No backup tech available - log and continue
        await prisma.eventLog.create({
          data: {
            projectId: booking.projectId,
            type: 'emergency.timeout_no_backup',
            payload: {
              bookingId: booking.id,
              technicianId: booking.technicianId,
              message: 'No backup technician available for escalation',
            },
          },
        })

        results.push({
          bookingId: booking.id,
          action: 'no_backup',
          technician: booking.technician.name,
        })
        continue
      }

      // PROXIMITY-BASED ESCALATION: Score backup techs by priority + distance
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY
      let nextTech: typeof availableBackupTechs[0] | null = null

      if (googleApiKey && booking.address) {
        // Helper to calculate distance (Haversine formula)
        const calculateDistance = (
          coord1: { lat: number; lng: number },
          coord2: { lat: number; lng: number }
        ): number => {
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

        // Helper to geocode address
        const geocodeAddress = async (addressStr: string): Promise<{ lat: number; lng: number } | null> => {
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

        // Geocode emergency address
        const emergencyCoords = await geocodeAddress(booking.address)

        if (emergencyCoords) {
          // Score each backup tech: priority + proximity
          const scoredTechs: Array<{ tech: typeof availableBackupTechs[0]; score: number; distance?: number }> = []

          for (const candidateTech of availableBackupTechs) {
            let score = (candidateTech.priority || 0) * 10 // Priority score

            // Calculate distance from tech's home address to emergency
            if (candidateTech.address) {
              const techHomeCoords = await geocodeAddress(candidateTech.address)
              if (techHomeCoords) {
                const distance = calculateDistance(techHomeCoords, emergencyCoords)
                
                // Proximity bonus: closer = higher score
                if (distance < 2) {
                  score += 30
                } else if (distance < 5) {
                  score += 25
                } else if (distance < 10) {
                  score += 20
                } else if (distance < 15) {
                  score += 15
                } else {
                  score += 10
                }

                scoredTechs.push({ tech: candidateTech, score, distance })
              } else {
                scoredTechs.push({ tech: candidateTech, score })
              }
            } else {
              scoredTechs.push({ tech: candidateTech, score })
            }
          }

          // Sort by score (highest first), then by priority, then by distance
          scoredTechs.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score
            if (b.tech.priority !== a.tech.priority) return (b.tech.priority || 0) - (a.tech.priority || 0)
            if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance
            return 0
          })

          if (scoredTechs.length > 0) {
            nextTech = scoredTechs[0].tech
          }
        } else {
          // Geocoding failed - use priority only
          nextTech = availableBackupTechs[0]
        }
      } else {
        // No Google API key or no address - use priority only
        nextTech = availableBackupTechs[0]
      }

      if (nextTech) {
        // Escalate to next tech
        console.log(`[Emergency Timeout] Escalating booking ${booking.id} from tech ${booking.technician.name} to ${nextTech.name}`)

        // Update booking to new technician
        await prisma.booking.update({
          where: { id: booking.id },
          data: { technicianId: nextTech.id },
        })

        // Notify new tech
        const message = `🚨 EMERGENCY DISPATCH - ${booking.project.name} (ESCALATED)\n\nCustomer: ${booking.customerName}\nPhone: ${booking.customerPhone}\nAddress: ${booking.address}\nIssue: ${booking.notes?.replace('[EMERGENCY DISPATCH]', '').trim() || 'N/A'}\n\nPrevious tech did not respond. Please call the customer and head over. Reply 1 if en route.`
        
        await sendSMS({ to: nextTech.phone, message })

        // Make phone call
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://afterhourfix.com'
        const twimlUrl = `${appUrl}/api/emergency/notify-call?bookingId=${booking.id}&technicianId=${nextTech.id}`
        
        await makePhoneCall({
          to: nextTech.phone,
          twimlUrl,
        })

        // Log escalation
        await prisma.eventLog.create({
          data: {
            projectId: booking.projectId,
            type: 'emergency.escalated',
            payload: {
              bookingId: booking.id,
              previousTechnicianId: booking.technicianId,
              newTechnicianId: nextTech.id,
              reason: 'timeout_no_response',
            },
          },
        })

        results.push({
          bookingId: booking.id,
          action: 'escalated',
          fromTech: booking.technician.name,
          toTech: nextTech.name,
        })
      } else {
        // No backup tech available - notify project manager/owner
        console.log(`[Emergency Timeout] No backup tech available for booking ${booking.id}, notifying project owner`)

        // Log that no backup was available
        await prisma.eventLog.create({
          data: {
            projectId: booking.projectId,
            type: 'emergency.timeout_no_backup',
            payload: {
              bookingId: booking.id,
              technicianId: booking.technicianId,
              message: 'No backup technician available for escalation',
            },
          },
        })

        results.push({
          bookingId: booking.id,
          action: 'no_backup',
          technician: booking.technician.name,
        })
      }
    }

    return NextResponse.json({
      success: true,
      checked: unacknowledged.length,
      results,
    })
  } catch (error: any) {
    console.error('[Emergency Timeout Check] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

