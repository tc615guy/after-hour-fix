import { NextRequest, NextResponse } from 'next/server'
import { runProjectAnalysis, runGlobalAnalysis } from '@/lib/ai-learning/background-analysis'
import { getServerSession } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

/**
 * POST: Trigger analysis for a specific project or all projects
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, global } = body

    if (global) {
      // Admin only - run global analysis
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      })

      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }

      const results = await runGlobalAnalysis()

      return NextResponse.json({
        success: true,
        message: `Analyzed ${results.length} projects`,
        results: results.map(r => ({
          projectId: r.projectId,
          analyzedCalls: r.analyzedCalls,
          insights: {
            knowledgeGaps: r.knowledgeGaps,
            suggestions: r.promptSuggestions,
            autoFAQs: r.autoFAQs,
          },
        })),
      })
    } else if (projectId) {
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

      const result = await runProjectAnalysis(projectId)

      return NextResponse.json({
        success: true,
        message: `Analysis complete for project ${projectId}`,
        result: {
          analyzedCalls: result.analyzedCalls,
          insights: {
            knowledgeGaps: result.knowledgeGaps,
            suggestions: result.promptSuggestions,
            autoFAQs: result.autoFAQs,
          },
          timestamp: result.timestamp,
        },
      })
    } else {
      return NextResponse.json({ error: 'projectId or global flag required' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[AI Insights] Analysis error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to run analysis' 
    }, { status: 500 })
  }
}

