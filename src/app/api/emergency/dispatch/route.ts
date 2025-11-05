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

    // Find highest-priority on-call technician
    const tech = await prisma.technician.findFirst({
      where: { projectId, isActive: true, isOnCall: true },
      orderBy: { priority: 'desc' },
    })

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
      const slotStart = slotStartIso ? new Date(slotStartIso) : new Date()
      const slotEnd = new Date((slotStart?.getTime() || Date.now()) + 60 * 60 * 1000)
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
      // Update existing booking to assign technician
      await prisma.booking.update({
        where: { id: booking.id },
        data: { technicianId: tech.id },
      })
    }

    // Notify the technician by SMS AND phone call
    const apptTime = booking?.slotStart
      ? new Date(booking.slotStart).toLocaleString()
      : 'ASAP (within 30–60 minutes)'
    const message = `🚨 EMERGENCY DISPATCH - ${project.name}\n\nCustomer: ${customerName}\nPhone: ${customerPhone}\nAddress: ${address}\nIssue: ${notes || 'N/A'}\nAppointment: ${apptTime}\n\nPlease call the customer and head over. Reply 1 if en route.`
    
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

    return NextResponse.json({
      dispatched: true,
      technician: { id: tech.id, name: tech.name, phone: tech.phone },
      bookingId: booking.id,
      result: `You’re booked. I’ve dispatched ${tech.name}. They’ll call you on the way and arrive within 30–60 minutes.`,
    })
  } catch (error: any) {
    console.error('[Emergency Dispatch] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
