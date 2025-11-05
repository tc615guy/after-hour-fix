import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/calcom/check-connection?projectId=xxx
 * Checks if the Cal.com connection is still valid
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        calcomApiKey: true,
        calcomAccessToken: true,
        calcomUserId: true,
        calcomEventTypeId: true,
        calcomUser: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if Cal.com is connected
    if (!project.calcomApiKey && !project.calcomAccessToken) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Not connected' 
      })
    }

    // Try to verify the connection by fetching user info
    const apiKey = project.calcomApiKey
    const accessToken = project.calcomAccessToken
    const baseUrl = process.env.CALCOM_BASE_URL || 'https://api.cal.com'

    let headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    } else if (accessToken) {
      headers['cal-api-version'] = '2024-08-13'
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    // Test 1: Verify user exists
    const userRes = await fetch(`${baseUrl}/v1/me`, { 
      headers,
      method: 'GET',
    })

    if (!userRes.ok) {
      return NextResponse.json({ 
        valid: false, 
        error: 'API key or access token is invalid',
        statusCode: userRes.status 
      })
    }

    const userData = await userRes.json()
    const username = userData.username || userData.user?.username || project.calcomUser

    // Test 2: Verify event type exists (if we have one)
    if (project.calcomEventTypeId) {
      const eventTypeRes = await fetch(
        `${baseUrl}/v1/event-types/${project.calcomEventTypeId}`,
        { headers, method: 'GET' }
      )

      if (!eventTypeRes.ok) {
        return NextResponse.json({ 
          valid: false, 
          error: 'Event type no longer exists',
          username 
        })
      }

      const eventTypeData = await eventTypeRes.json()
      const eventTypeName = eventTypeData.title || eventTypeData.event_type?.title

      return NextResponse.json({ 
        valid: true, 
        username,
        eventTypeName,
        userId: userData.id || userData.user?.id
      })
    }

    // If no event type, just return user info
    return NextResponse.json({ 
      valid: true, 
      username,
      userId: userData.id || userData.user?.id,
      warning: 'No event type configured'
    })

  } catch (error: any) {
    console.error('[Cal.com Check Connection] Error:', error)
    return NextResponse.json({ 
      valid: false, 
      error: error.message || 'Connection check failed' 
    }, { status: 500 })
  }
}

