import { NextRequest, NextResponse } from 'next/server'

const CALCOM_OAUTH_URL = process.env.CALCOM_OAUTH_URL || 'https://app.cal.com/oauth/authorize'
const CALCOM_CLIENT_ID = process.env.CALCOM_OAUTH_CLIENT_ID
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      )
    }

    if (!CALCOM_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Cal.com OAuth not configured' },
        { status: 500 }
      )
    }

    // Build OAuth authorization URL
    const params = new URLSearchParams({
      client_id: CALCOM_CLIENT_ID,
      redirect_uri: `${APP_URL}/api/calcom/oauth/callback`,
      response_type: 'code',
      scope: 'read:bookings write:bookings read:user write:event-types',
      state: projectId, // Pass projectId as state
    })

    const authUrl = `${CALCOM_OAUTH_URL}?${params.toString()}`

    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('[Cal.com OAuth] Authorization error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Cal.com authorization' },
      { status: 500 }
    )
  }
}
