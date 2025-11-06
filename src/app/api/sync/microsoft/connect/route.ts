/**
 * Microsoft Calendar OAuth Connect
 * Initiates OAuth flow for Microsoft Calendar
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

const MS_OAUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const SCOPES = ['Calendars.ReadWrite', 'offline_access'].join(' ')

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/sync/microsoft/callback`

    if (!clientId) {
      return NextResponse.json({ error: 'Microsoft OAuth not configured' }, { status: 500 })
    }

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      response_mode: 'query',
      prompt: 'consent', // Force consent to get refresh token
      state: Buffer.from(JSON.stringify({ email: session.user.email })).toString('base64'),
    })

    const authUrl = `${MS_OAUTH_URL}?${params.toString()}`

    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('[Microsoft OAuth] Connect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

