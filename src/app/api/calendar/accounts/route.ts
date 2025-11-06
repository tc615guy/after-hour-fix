/**
 * List Calendar Accounts
 * Get all connected calendar accounts for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all accounts with mappings
    const accounts = await prisma.externalCalendarAccount.findMany({
      where: { userId: user.id },
      include: {
        calendarMappings: {
          include: {
            account: false, // Avoid circular reference
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Remove sensitive data (tokens are encrypted anyway, but don't send them)
    const safeAccounts = accounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      accountEmail: account.accountEmail,
      icsUrl: account.icsUrl,
      lastSyncedAt: account.lastSyncedAt,
      tokenExpiresAt: account.tokenExpiresAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      calendarMappings: account.calendarMappings,
    }))

    return NextResponse.json({ accounts: safeAccounts })
  } catch (error: any) {
    console.error('[Calendar Accounts] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

