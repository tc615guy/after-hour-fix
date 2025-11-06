/**
 * Microsoft Calendar OAuth Callback
 * Handles OAuth callback and stores tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/calendar/utils'

const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const MS_GRAPH_URL = 'https://graph.microsoft.com/v1.0/me'

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

    // Get current session
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?error=unauthorized`)
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?error=user_not_found`)
    }

    // Exchange code for tokens
    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/sync/microsoft/callback`

    const tokenResponse = await fetch(MS_TOKEN_URL, {
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
        scope: 'Calendars.ReadWrite offline_access',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('[Microsoft OAuth] Token exchange error:', errorData)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?error=token_exchange_failed`)
    }

    const tokens = await tokenResponse.json()

    // Get user info
    const userinfoResponse = await fetch(MS_GRAPH_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const userinfo = await userinfoResponse.json()

    // Create or update account
    const existingAccount = await prisma.externalCalendarAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'microsoft',
        accountEmail: userinfo.userPrincipalName || userinfo.mail,
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
        },
      })

      if (!existingMapping) {
        await prisma.calendarMapping.create({
          data: {
            userId: user.id,
            accountId: existingAccount.id,
            provider: 'microsoft',
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
          provider: 'microsoft',
          accountEmail: userinfo.userPrincipalName || userinfo.mail,
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
          provider: 'microsoft',
          direction: 'two-way',
          visibility: 'busyOnly',
        },
      })
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?connected=microsoft`)
  } catch (error: any) {
    console.error('[Microsoft OAuth] Callback error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings/calendar?error=callback_failed`)
  }
}

