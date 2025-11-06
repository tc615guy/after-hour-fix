import { NextRequest, NextResponse } from 'next/server'
import { exportFineTuningData, getFineTuningStats } from '@/lib/ai-learning/fine-tuning-export'
import { getServerSession } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

/**
 * GET: Get fine-tuning export statistics
 */
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

    const stats = await getFineTuningStats(projectId)

    return NextResponse.json({ 
      success: true,
      stats,
    })
  } catch (error: any) {
    console.error('[AI Insights] Fine-tuning stats error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to get fine-tuning stats' 
    }, { status: 500 })
  }
}

/**
 * POST: Export fine-tuning data
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { projectId } = body

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

    const examples = await exportFineTuningData(projectId)

    // Return as downloadable JSON
    return NextResponse.json({
      success: true,
      examples,
      count: examples.length,
      message: `Exported ${examples.length} high-quality call examples ready for OpenAI fine-tuning`,
    })
  } catch (error: any) {
    console.error('[AI Insights] Fine-tuning export error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to export fine-tuning data' 
    }, { status: 500 })
  }
}

