import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Twilio call status callback webhook
 * Tracks the status of emergency dispatch phone calls to technicians
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const callSid = formData.get('CallSid') as string | null
    const callStatus = formData.get('CallStatus') as string | null
    const to = formData.get('To') as string | null

    if (!callSid || !callStatus) {
      console.error('[Emergency Call Status] Missing CallSid or CallStatus')
      return new NextResponse('Missing parameters', { status: 400 })
    }

    console.log(`[Emergency Call Status] Call ${callSid} status: ${callStatus} (to: ${to})`)

    // Find the most recent emergency dispatch event for this call
    const recentDispatch = await prisma.eventLog.findFirst({
      where: {
        type: 'emergency.dispatched',
        payload: {
          path: ['callSid'],
          equals: callSid,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (recentDispatch) {
      // Update the dispatch event with call status
      const payload = recentDispatch.payload as any
      await prisma.eventLog.update({
        where: { id: recentDispatch.id },
        data: {
          payload: {
            ...payload,
            callStatus,
            callStatusUpdatedAt: new Date().toISOString(),
          },
        },
      })
    }

    // Log the status update
    if (recentDispatch?.projectId) {
      await prisma.eventLog.create({
        data: {
          projectId: recentDispatch.projectId,
          type: 'emergency.call_status',
          payload: {
            callSid,
            callStatus,
            to,
          },
        },
      })
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error: any) {
    console.error('[Emergency Call Status] Error:', error)
    return new NextResponse('Error processing call status', { status: 500 })
  }
}

