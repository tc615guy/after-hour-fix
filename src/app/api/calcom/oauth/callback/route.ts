import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import axios from 'axios'
import { createEventTypePayload } from '@/lib/trade-templates'

const CALCOM_BASE_URL = process.env.CALCOM_BASE_URL || 'https://api.cal.com/v1'
const CALCOM_CLIENT_ID = process.env.CALCOM_OAUTH_CLIENT_ID
const CALCOM_CLIENT_SECRET = process.env.CALCOM_OAUTH_CLIENT_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // projectId
    const error = searchParams.get('error')

    if (error) {
      console.error('[Cal.com OAuth] Error:', error)
      return NextResponse.redirect(
        `${APP_URL}/dashboard?error=calcom_auth_failed`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard?error=missing_oauth_params`
      )
    }

    const projectId = state

    // Exchange code for access token
    const tokenResponse = await axios.post(
      `${CALCOM_BASE_URL}/oauth/token`,
      {
        grant_type: 'authorization_code',
        code,
        client_id: CALCOM_CLIENT_ID,
        client_secret: CALCOM_CLIENT_SECRET,
        redirect_uri: `${APP_URL}/api/calcom/oauth/callback`,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const {
      access_token,
      refresh_token,
      expires_in,
      user_id,
    } = tokenResponse.data

    // Calculate expiry
    const tokenExpiry = new Date(Date.now() + expires_in * 1000)

    // Get user info from Cal.com
    const userResponse = await axios.get(`${CALCOM_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    const calcomUser = userResponse.data

    // Auto-create event type for this project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new Error('Project not found')
    }

    // Create event type for the trade with trade-specific template
    const eventTypePayload = createEventTypePayload(
      project.name,
      project.trade,
      undefined, // userId not needed for OAuth method
      calcomUser.defaultScheduleId
    )

    const eventTypeResponse = await axios.post(
      `${CALCOM_BASE_URL}/event-types`,
      eventTypePayload,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const eventType = eventTypeResponse.data.event_type

    // Update project with Cal.com OAuth credentials
    await prisma.project.update({
      where: { id: projectId },
      data: {
        calcomUserId: user_id,
        calcomAccessToken: access_token, // TODO: Encrypt in production
        calcomRefreshToken: refresh_token, // TODO: Encrypt in production
        calcomTokenExpiry: tokenExpiry,
        calcomEventTypeId: eventType.id,
        calcomConnectedAt: new Date(),
        calcomUser: calcomUser.username,
      },
    })

    console.log('[Cal.com OAuth] Successfully connected:', {
      projectId,
      userId: user_id,
      eventTypeId: eventType.id,
    })

    return NextResponse.redirect(
      `${APP_URL}/dashboard?success=calcom_connected`
    )
  } catch (error: any) {
    console.error('[Cal.com OAuth] Error:', error.response?.data || error.message)
    return NextResponse.redirect(
      `${APP_URL}/dashboard?error=calcom_connection_failed`
    )
  }
}
