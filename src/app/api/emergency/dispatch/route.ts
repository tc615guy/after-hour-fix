import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSMS, makePhoneCall } from '@/lib/sms'
import { createVapiClient } from '@/lib/vapi'
import { z } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const Schema = z.object({
      projectId: z.string().min(1),
      customerName: z.string().min(1),
      customerPhone: z.string().min(7),
      address: z.string().min(3),
      notes: z.string().optional(),
      callId: z.string().optional(),
      bookingId: z.string().optional(),
      slotStart: z.string().optional(),
    })
    const { projectId, customerName, customerPhone, address, notes, callId, bookingId, slotStart: slotStartIso } = Schema.parse(await req.json())

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get all on-call technicians for proximity-based routing
    const onCallTechs = await prisma.technician.findMany({
      where: { projectId, isActive: true, isOnCall: true },
      orderBy: { priority: 'desc' },
    })

    if (onCallTechs.length === 0) {
      return NextResponse.json({
        dispatched: false,
        result:
          "I understand this is urgent. We don't have a tech available this minute, but I can schedule you first thing tomorrow morning.",
      })
    }

    // PROXIMITY-BASED ROUTING: Score techs by priority + distance to emergency
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY
    let tech: typeof onCallTechs[0] | null = null
    let assignmentReason = 'Priority only'

    // Helper to round time up to nearest 30-minute slot (always available)
    const roundToNext30MinSlot = (date: Date): Date => {
      const minutes = date.getMinutes()
      const hours = date.getHours()
      
      // If already at :00 or :30, use that time
      if (minutes === 0 || minutes === 30) {
        return new Date(date)
      }
      
      // Round up to next :00 or :30
      let targetMinutes: number
      let targetHours = hours
      
      if (minutes < 30) {
        targetMinutes = 30
      } else {
        targetMinutes = 0
        targetHours = hours + 1
      }
      
      const rounded = new Date(date)
      rounded.setHours(targetHours, targetMinutes, 0, 0)
      return rounded
    }

    if (googleApiKey && address) {
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

      // Helper to get drive time between two addresses using Google Maps Distance Matrix API
      const getDriveTime = async (origin: string, destination: string): Promise<number | null> => {
        try {
          const originEncoded = encodeURIComponent(origin)
          const destEncoded = encodeURIComponent(destination)
          const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originEncoded}&destinations=${destEncoded}&mode=driving&key=${googleApiKey}`
          const response = await fetch(url)
          const data = await response.json()
          
          if (data.status === 'OK' && 
              data.rows && 
              data.rows.length > 0 && 
              data.rows[0].elements && 
              data.rows[0].elements.length > 0 &&
              data.rows[0].elements[0].status === 'OK') {
            // Duration is in seconds, convert to minutes
            const durationSeconds = data.rows[0].elements[0].duration.value
            return Math.ceil(durationSeconds / 60) // Round up to nearest minute
          }
          return null
        } catch (error) {
          console.error('[Emergency Dispatch] Drive time calculation error:', error)
          return null
        }
      }

      // Geocode emergency address
      const emergencyCoords = await geocodeAddress(address)

      if (emergencyCoords) {
        // Score each tech: priority + proximity
        const scoredTechs: Array<{ tech: typeof onCallTechs[0]; score: number; distance?: number; driveTimeMin?: number; reason: string }> = []

        for (const candidateTech of onCallTechs) {
          let score = (candidateTech.priority || 0) * 10 // Priority score (higher = better)
          let reason = `Priority: ${candidateTech.priority || 0}`

          // Calculate distance and drive time from tech's home address to emergency
          if (candidateTech.address) {
            const techHomeCoords = await geocodeAddress(candidateTech.address)
            if (techHomeCoords) {
              const distance = calculateDistance(techHomeCoords, emergencyCoords)
              
              // Get actual drive time from Google Maps
              const driveTimeMin = await getDriveTime(candidateTech.address, address)
              
              // Proximity bonus: closer = higher score
              // Distance scoring: 0-2 mi = +30, 2-5 mi = +25, 5-10 mi = +20, 10-15 mi = +15, 15+ mi = +10
              if (distance < 2) {
                score += 30
                reason += `, ${distance.toFixed(1)} mi away (very close)`
              } else if (distance < 5) {
                score += 25
                reason += `, ${distance.toFixed(1)} mi away (close)`
              } else if (distance < 10) {
                score += 20
                reason += `, ${distance.toFixed(1)} mi away (nearby)`
              } else if (distance < 15) {
                score += 15
                reason += `, ${distance.toFixed(1)} mi away`
              } else {
                score += 10
                reason += `, ${distance.toFixed(1)} mi away`
              }
              
              if (driveTimeMin) {
                reason += ` (~${driveTimeMin} min drive)`
              }

              scoredTechs.push({ tech: candidateTech, score, distance, driveTimeMin: driveTimeMin || undefined, reason })
            } else {
              // Can't geocode tech's address - use priority only
              scoredTechs.push({ tech: candidateTech, score, reason })
            }
          } else {
            // No home address - use priority only
            scoredTechs.push({ tech: candidateTech, score, reason })
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
          const selectedTech = scoredTechs[0]
          tech = selectedTech.tech
          assignmentReason = selectedTech.reason
          
          // Calculate estimated arrival time with 20-minute buffer + drive time
          if (selectedTech.driveTimeMin !== undefined) {
            const PREP_BUFFER_MIN = 20 // 20 minutes for tech to get ready
            const totalMinutes = PREP_BUFFER_MIN + selectedTech.driveTimeMin
            const estimatedArrival = new Date(Date.now() + totalMinutes * 60 * 1000)
            const roundedSlot = roundToNext30MinSlot(estimatedArrival)
            
            // Store calculated slot time to use for booking
            assignmentReason += ` | Arrival: ${roundedSlot.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (${PREP_BUFFER_MIN}min prep + ${selectedTech.driveTimeMin}min drive)`
            
            // Store on tech object for use in booking creation
            ;(tech as any).calculatedSlotTime = roundedSlot
          }
          
          console.log(`[Emergency Dispatch] Selected tech: ${tech.name} - ${assignmentReason} (score: ${selectedTech.score})`)
        }
      } else {
        // Geocoding failed - fall back to priority only
        tech = onCallTechs[0]
        assignmentReason = `Priority: ${tech.priority || 0} (proximity unavailable)`
      }
    } else {
      // No Google API key or no address - use priority only
      tech = onCallTechs[0]
      assignmentReason = `Priority: ${tech.priority || 0}`
    }

    if (!tech) {
      return NextResponse.json({
        dispatched: false,
        result:
          "I understand this is urgent. We don't have a tech available this minute, but I can schedule you first thing tomorrow morning.",
      })
    }

    // Use existing booking when provided; otherwise create a pending emergency booking
    let booking = null as unknown as { id: string; slotStart: Date | null }
    if (bookingId) {
      const existing = await prisma.booking.findUnique({ where: { id: bookingId } })
      if (existing) {
        booking = { id: existing.id, slotStart: existing.slotStart }
      }
    }
    if (!booking) {
      // Calculate slot start time:
      // 1. Use calculated arrival time (with buffer + drive time) if available
      // 2. Otherwise use provided slotStartIso
      // 3. Otherwise use current time
      let slotStart: Date
      const calculatedSlotTime = (tech as any).calculatedSlotTime
      
      if (calculatedSlotTime) {
        // Use the calculated time (already rounded to 30-min slot)
        slotStart = calculatedSlotTime
      } else if (slotStartIso) {
        slotStart = new Date(slotStartIso)
      } else {
        // Fallback: current time + 20 min buffer, rounded to 30-min slot
        const fallbackTime = new Date(Date.now() + 20 * 60 * 1000)
        slotStart = roundToNext30MinSlot(fallbackTime)
      }
      
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000) // 1 hour duration
      
      const created = await prisma.booking.create({
        data: {
          projectId,
          customerName,
          customerPhone,
          address,
          notes: `[EMERGENCY DISPATCH] ${notes || ''}`.trim(),
          slotStart,
          slotEnd,
          status: 'pending',
          isEmergency: true,
          technicianId: tech.id, // Assign technician to booking
        },
      })
      booking = { id: created.id, slotStart: created.slotStart }
    } else {
      // Update existing booking to assign technician and update slot time if calculated
      const updateData: any = { technicianId: tech.id }
      const calculatedSlotTime = (tech as any).calculatedSlotTime
      
      if (calculatedSlotTime) {
        updateData.slotStart = calculatedSlotTime
        updateData.slotEnd = new Date(calculatedSlotTime.getTime() + 60 * 60 * 1000)
      }
      
      await prisma.booking.update({
        where: { id: booking.id },
        data: updateData,
      })
      
      // Update booking object with new slot time
      if (calculatedSlotTime) {
        booking.slotStart = calculatedSlotTime
      }
    }

    // Notify the technician by SMS AND phone call
    let apptTime: string
    if (booking?.slotStart) {
      const slotTime = new Date(booking.slotStart)
      apptTime = slotTime.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
    } else {
      apptTime = 'ASAP (within 30–60 minutes)'
    }
    const message = `🚨 EMERGENCY DISPATCH - ${project.name}\n\nCustomer: ${customerName}\nPhone: ${customerPhone}\nAddress: ${address}\nIssue: ${notes || 'N/A'}\nTarget Arrival: ${apptTime}\n\nPlease call the customer and head over. Reply 1 if en route.`
    
    // Send SMS
    await sendSMS({ to: tech.phone, message })

    // Make phone call with emergency notification
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://afterhourfix.com'
    const twimlUrl = `${appUrl}/api/emergency/notify-call?bookingId=${booking.id}&technicianId=${tech.id}`
    const callStatusUrl = `${appUrl}/api/emergency/call-status`
    
    const callSid = await makePhoneCall({
      to: tech.phone,
      twimlUrl,
      statusCallback: callStatusUrl,
    })

    // Log the dispatch
    await prisma.eventLog.create({
      data: {
        projectId,
        type: 'emergency.dispatched',
        payload: {
          bookingId: booking.id,
          technicianId: tech.id,
          technicianName: tech.name,
          technicianPhone: tech.phone,
          customerName,
          customerPhone,
          address,
          callSid,
          smsSent: true,
          callInitiated: !!callSid,
          assignmentReason, // Log why this tech was selected
        },
      },
    })

    // Attempt live transfer of active call, if provided
    if (callId) {
      try {
        const vapi = createVapiClient()
        await vapi.transferCall(callId, tech.phone)
        await prisma.eventLog.create({
          data: { type: 'emergency.transferred', projectId, payload: { callId, to: tech.phone } },
        })
      } catch (e: any) {
        await prisma.eventLog.create({
          data: {
            type: 'emergency.transfer_failed',
            projectId,
            payload: { callId, error: e?.message || 'transfer failed' },
          },
        })
      }
    }

    // Generate customer-facing message with arrival time
    let customerMessage: string
    if (booking?.slotStart) {
      const slotTime = new Date(booking.slotStart)
      const timeStr = slotTime.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
      customerMessage = `You're booked. I've dispatched ${tech.name}. They'll call you on the way and should arrive by ${timeStr}.`
    } else {
      customerMessage = `You're booked. I've dispatched ${tech.name}. They'll call you on the way and arrive within 30–60 minutes.`
    }

    return NextResponse.json({
      dispatched: true,
      technician: { id: tech.id, name: tech.name, phone: tech.phone },
      bookingId: booking.id,
      result: customerMessage,
    })
  } catch (error: any) {
    console.error('[Emergency Dispatch] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
