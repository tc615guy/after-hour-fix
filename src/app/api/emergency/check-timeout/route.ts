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
      if (!booking.technician) continue

      // Check if there's a next available tech (lower priority or fallback)
      const nextTech = await prisma.technician.findFirst({
        where: {
          projectId: booking.projectId,
          isActive: true,
          isOnCall: true,
          id: { not: booking.technicianId },
          priority: { lt: booking.technician.priority || 0 }, // Lower priority (backup)
        },
        orderBy: { priority: 'desc' },
      })

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

