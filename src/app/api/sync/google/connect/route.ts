/**
 * Google Calendar OAuth Connect
 * Initiates OAuth flow for Google Calendar
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/supabase/server'

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/sync/google/callback`

    if (!clientId) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
    }

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent to get refresh token
      state: 'google-calendar-connect', // Simple state for CSRF protection
    })

    const authUrl = `${GOOGLE_OAUTH_URL}?${params.toString()}`

    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('[Google OAuth] Connect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

