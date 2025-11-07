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
    console.log(`[Cal.com Check] Testing connection for project ${projectId}`)
    console.log(`[Cal.com Check] Using ${apiKey ? 'API Key' : 'Access Token'}`)
    console.log(`[Cal.com Check] Calling: ${baseUrl}/v1/me`)
    
    const userRes = await fetch(`${baseUrl}/v1/me`, { 
      headers,
      method: 'GET',
    })

    console.log(`[Cal.com Check] User fetch response status: ${userRes.status}`)

    if (!userRes.ok) {
      const errorText = await userRes.text()
      console.error(`[Cal.com Check] User fetch failed: ${errorText}`)
      return NextResponse.json({ 
        valid: false, 
        error: 'API key or access token is invalid',
        statusCode: userRes.status,
        details: errorText.substring(0, 200)
      })
    }

    const userData = await userRes.json()
    console.log(`[Cal.com Check] User data:`, JSON.stringify(userData, null, 2))
    const username = userData.username || userData.user?.username || project.calcomUser

    // Test 2: Verify event type exists (if we have one)
    if (project.calcomEventTypeId) {
      console.log(`[Cal.com Check] Checking event type: ${project.calcomEventTypeId}`)
      const eventTypeRes = await fetch(
        `${baseUrl}/v1/event-types/${project.calcomEventTypeId}`,
        { headers, method: 'GET' }
      )

      console.log(`[Cal.com Check] Event type fetch response status: ${eventTypeRes.status}`)

      if (!eventTypeRes.ok) {
        const errorText = await eventTypeRes.text()
        console.error(`[Cal.com Check] Event type fetch failed: ${errorText}`)
        return NextResponse.json({ 
          valid: false, 
          error: 'Event type no longer exists',
          username,
          statusCode: eventTypeRes.status,
          details: errorText.substring(0, 200)
        })
      }

      const eventTypeData = await eventTypeRes.json()
      console.log(`[Cal.com Check] Event type data:`, JSON.stringify(eventTypeData, null, 2))
      const eventTypeName = eventTypeData.title || eventTypeData.event_type?.title

      console.log(`[Cal.com Check] ✅ Connection valid for ${username}`)
      return NextResponse.json({ 
        valid: true, 
        username,
        eventTypeName,
        userId: userData.id || userData.user?.id
      })
    }

    // If no event type, just return user info
    console.log(`[Cal.com Check] ⚠️  Connection valid but no event type configured for ${username}`)
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

