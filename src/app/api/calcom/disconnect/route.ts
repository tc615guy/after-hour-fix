import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from '@/lib/supabase/server'

/**
 * Disconnect Cal.com integration for a project
 * Clears all Cal.com-related fields
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await req.json()
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Clear all Cal.com fields
    await prisma.project.update({
      where: { id: projectId },
      data: {
        calcomApiKey: null,
        calcomUser: null,
        calcomUserId: null,
        calcomAccessToken: null,
        calcomRefreshToken: null,
        calcomTokenExpiry: null,
        calcomEventTypeId: null,
        calcomConnectedAt: null,
      },
    })

    console.log(`[Cal.com Disconnect] Cleared Cal.com integration for project ${projectId}`)

    return NextResponse.json({ 
      success: true,
      message: 'Cal.com integration disconnected successfully'
    })
  } catch (error: any) {
    console.error('[Cal.com Disconnect] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    )
  }
}

