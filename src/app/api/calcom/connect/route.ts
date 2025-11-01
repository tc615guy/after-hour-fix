import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import axios from 'axios'
import { createEventTypePayload } from '@/lib/trade-templates'

const CALCOM_BASE_URL = 'https://api.cal.com/v1'

/**
 * Simplified Cal.com connection
 * User provides API key, we verify and auto-setup everything
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, apiKey } = await req.json()

    if (!projectId || !apiKey) {
      return NextResponse.json(
        { error: 'Missing projectId or apiKey' },
        { status: 400 }
      )
    }

    // Verify API key by fetching user info
    const userResponse = await axios.get(`${CALCOM_BASE_URL}/me`, {
      params: { apiKey },
    })

    const calcomUserRaw = userResponse.data
    const calcomUser = calcomUserRaw?.user ?? calcomUserRaw
    const userIdRaw = calcomUser?.id
    const userId = typeof userIdRaw === 'string' ? parseInt(userIdRaw, 10) : userIdRaw
    const defaultScheduleIdFromUser = calcomUser?.defaultScheduleId

    if (!userId) {
      return NextResponse.json(
        { error: 'Failed to read Cal.com user id from /me. Please verify your API key.' },
        { status: 400 }
      )
    }

    // Get user's schedules
    const schedulesResponse = await axios.get(`${CALCOM_BASE_URL}/schedules`, {
      params: { apiKey },
    })

    const schedulesRaw = schedulesResponse.data
    const schedules = schedulesRaw?.schedules ?? schedulesRaw ?? []
    const defaultSchedule =
      schedules.find((s: any) => s.isDefault) ||
      schedules.find((s: any) => s.id === defaultScheduleIdFromUser) ||
      schedules[0]

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new Error('Project not found')
    }

    // Create event type automatically with trade-specific template
    const eventTypePayload = createEventTypePayload(
      project.name,
      project.trade,
      userId,
      defaultSchedule?.id ?? defaultScheduleIdFromUser
    )

    const eventTypeResponse = await axios.post(
      `${CALCOM_BASE_URL}/event-types`,
      eventTypePayload,
      {
        params: { apiKey },
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const eventType = eventTypeResponse.data.event_type

    console.log('[Cal.com Connect] Event type created:', {
      eventTypeId: eventType.id,
      userId: calcomUser.id,
      projectId,
    })

    // Update project with Cal.com info
    await prisma.project.update({
      where: { id: projectId },
      data: {
        calcomApiKey: apiKey,
        calcomUser: calcomUser.username,
        calcomUserId: calcomUser.id,
        calcomEventTypeId: eventType.id,
        calcomConnectedAt: new Date(),
      },
    })

    await prisma.eventLog.create({
      data: {
        projectId,
        type: 'calcom.connected',
        payload: {
          userId: calcomUser.id,
          username: calcomUser.username,
          eventTypeId: eventType.id,
        },
      },
    })

    return NextResponse.json({
      success: true,
      calcomUser: {
        id: calcomUser.id,
        username: calcomUser.username,
        email: calcomUser.email,
      },
      eventType: {
        id: eventType.id,
        title: eventType.title,
        slug: eventType.slug,
      },
    })
  } catch (error: any) {
    console.error('[Cal.com Connect] Error:', error.response?.data || error.message)

    // Provide helpful error messages
    let errorMessage = 'Failed to connect Cal.com account'

    if (error.response?.status === 401) {
      errorMessage = 'Invalid Cal.com API key. Please check and try again.'
    } else if (error.response?.data?.message) {
      // Surface Cal.com validation errors
      errorMessage = `Cal.com error: ${error.response.data.message}`
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    }

    return NextResponse.json(
      { error: errorMessage, details: error.response?.data },
      { status: 400 }
    )
  }
}
