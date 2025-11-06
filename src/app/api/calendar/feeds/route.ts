/**
 * ICS Feeds API
 * List and create ICS feeds
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { generateSecureToken } from '@/lib/calendar/utils'

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

    // Get all ICS feeds
    const feeds = await prisma.icsFeed.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ feeds })
  } catch (error: any) {
    console.error('[Calendar Feeds] GET Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const { name, projectId, technicianId, includeNotes = false, includePhone = false } = body

    if (!name) {
      return NextResponse.json({ error: 'Feed name is required' }, { status: 400 })
    }

    // Generate secure token
    const token = generateSecureToken(32)

    // Create feed
    const feed = await prisma.icsFeed.create({
      data: {
        userId: user.id,
        projectId: projectId || null,
        technicianId: technicianId || null,
        token,
        name,
        includeNotes,
        includePhone,
        enabled: true,
      },
    })

    return NextResponse.json({
      success: true,
      feed: {
        id: feed.id,
        name: feed.name,
        token: feed.token,
        includeNotes: feed.includeNotes,
        includePhone: feed.includePhone,
        enabled: feed.enabled,
        createdAt: feed.createdAt,
      },
    })
  } catch (error: any) {
    console.error('[Calendar Feeds] POST Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

