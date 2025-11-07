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
    const baseUrl = 'https://api.cal.com/v1'

    // Test 1: Verify user exists
    console.log(`[Cal.com Check] Testing connection for project ${projectId}`)
    console.log(`[Cal.com Check] Using ${apiKey ? 'API Key' : 'Access Token'}`)
    
    let userRes: Response
    
    if (apiKey) {
      // API Key: Pass as query parameter (Cal.com v1 API style)
      const url = `${baseUrl}/me?apiKey=${encodeURIComponent(apiKey)}`
      console.log(`[Cal.com Check] Calling: ${baseUrl}/me?apiKey=***`)
      userRes = await fetch(url, { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } else if (accessToken) {
      // OAuth Access Token: Use Authorization header (v2 API style)
      console.log(`[Cal.com Check] Calling: ${baseUrl}/me (with OAuth token)`)
      userRes = await fetch(`${baseUrl}/me`, { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'cal-api-version': '2024-08-13',
          'Authorization': `Bearer ${accessToken}`,
        },
      })
    } else {
      return NextResponse.json({ 
        valid: false, 
        error: 'No API key or access token found' 
      })
    }

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
      
      let eventTypeRes: Response
      if (apiKey) {
        // API Key: Pass as query parameter
        const url = `${baseUrl}/event-types/${project.calcomEventTypeId}?apiKey=${encodeURIComponent(apiKey)}`
        eventTypeRes = await fetch(url, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      } else {
        // OAuth: Use Authorization header
        eventTypeRes = await fetch(
          `${baseUrl}/event-types/${project.calcomEventTypeId}`,
          { 
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'cal-api-version': '2024-08-13',
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        )
      }

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

