/**
 * Google Calendar OAuth Callback
 * Handles OAuth callback and stores tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/calendar/utils'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?error=${error}`)
    }

    if (!code) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?error=no_code`)
    }

    // Decode state
    const stateData = JSON.parse(Buffer.from(state || '', 'base64').toString())
    const userEmail = stateData.email

    if (!userEmail) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?error=invalid_state`)
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?error=user_not_found`)
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/sync/google/callback`

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('[Google OAuth] Token exchange error:', errorData)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?error=token_exchange_failed`)
    }

    const tokens = await tokenResponse.json()

    // Get user info (email)
    const userinfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const userinfo = await userinfoResponse.json()

    // Create or update account
    const existingAccount = await prisma.externalCalendarAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'google',
        accountEmail: userinfo.email,
      },
    })

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    if (existingAccount) {
      // Update existing
      await prisma.externalCalendarAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
          tokenExpiresAt: expiresAt,
          lastSyncedAt: new Date(),
        },
      })

      // Update or create default mapping
      const existingMapping = await prisma.calendarMapping.findFirst({
        where: {
          accountId: existingAccount.id,
          providerCalendarId: 'primary',
        },
      })

      if (!existingMapping) {
        await prisma.calendarMapping.create({
          data: {
            userId: user.id,
            accountId: existingAccount.id,
            provider: 'google',
            providerCalendarId: 'primary',
            direction: 'two-way',
            visibility: 'busyOnly',
          },
        })
      }
    } else {
      // Create new account
      const newAccount = await prisma.externalCalendarAccount.create({
        data: {
          userId: user.id,
          provider: 'google',
          accountEmail: userinfo.email,
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
          tokenExpiresAt: expiresAt,
          lastSyncedAt: new Date(),
        },
      })

      // Create default mapping
      await prisma.calendarMapping.create({
        data: {
          userId: user.id,
          accountId: newAccount.id,
          provider: 'google',
          providerCalendarId: 'primary',
          direction: 'two-way',
          visibility: 'busyOnly',
        },
      })
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?connected=google`)
  } catch (error: any) {
    console.error('[Google OAuth] Callback error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?error=callback_failed`)
  }
}

