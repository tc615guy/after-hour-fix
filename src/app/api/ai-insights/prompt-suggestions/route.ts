import { NextRequest, NextResponse } from 'next/server'
import { generatePromptSuggestions } from '@/lib/ai-learning/call-intelligence'
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

    const minCallsRequired = parseInt(searchParams.get('minCalls') || '10')

    const suggestions = await generatePromptSuggestions(projectId, { minCallsRequired })

    return NextResponse.json({ 
      success: true,
      suggestions,
      summary: {
        total: suggestions.length,
        highConfidence: suggestions.filter(s => s.confidence >= 0.8).length,
      }
    })
  } catch (error: any) {
    console.error('[AI Insights] Error generating prompt suggestions:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate prompt suggestions' 
    }, { status: 500 })
  }
}

