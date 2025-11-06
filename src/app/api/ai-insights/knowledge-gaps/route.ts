import { NextRequest, NextResponse } from 'next/server'
import { identifyKnowledgeGaps } from '@/lib/ai-learning/call-intelligence'
import { getServerSession } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const limit = parseInt(searchParams.get('limit') || '100')
    const daysBack = parseInt(searchParams.get('daysBack') || '30')

    const gaps = await identifyKnowledgeGaps(projectId, { limit, daysBack })

    return NextResponse.json({ 
      success: true,
      gaps,
      summary: {
        total: gaps.length,
        unanswered: gaps.filter(g => !g.wasAnswered).length,
        frequent: gaps.filter(g => g.frequency >= 3).length,
      }
    })
  } catch (error: any) {
    console.error('[AI Insights] Error identifying knowledge gaps:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to identify knowledge gaps' 
    }, { status: 500 })
  }
}

