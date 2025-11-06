/**
 * Manual Calendar Sync
 * Trigger a manual sync for a specific calendar account
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { importFromExternal } from '@/lib/calendar/sync'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
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

    const { accountId } = await params

    // Verify account belongs to user
    const account = await prisma.externalCalendarAccount.findUnique({
      where: { id: accountId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Trigger sync
    const result = await importFromExternal({
      userId: user.id,
      accountId,
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Next 90 days
    })

    return NextResponse.json({
      success: true,
      summary: result.summary,
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      skipped: result.skipped,
      errors: result.errors,
    })
  } catch (error: any) {
    console.error('[Calendar Sync] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

