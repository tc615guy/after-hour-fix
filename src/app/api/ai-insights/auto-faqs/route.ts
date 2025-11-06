import { NextRequest, NextResponse } from 'next/server'
import { generateAutoFAQs } from '@/lib/ai-learning/call-intelligence'
import { getServerSession } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

/**
 * GET: Generate auto-FAQs from call patterns
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

    const faqs = await generateAutoFAQs(projectId)

    return NextResponse.json({ 
      success: true,
      faqs,
      summary: {
        total: faqs.length,
        highConfidence: faqs.filter(f => f.confidence >= 0.75).length,
      }
    })
  } catch (error: any) {
    console.error('[AI Insights] Error generating auto-FAQs:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate auto-FAQs' 
    }, { status: 500 })
  }
}

/**
 * POST: Accept and save an auto-generated FAQ
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, question, answer } = body

    if (!projectId || !question || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Get existing FAQs from EventLog
    const existingFAQs = await prisma.eventLog.findFirst({
      where: {
        projectId,
        type: 'faqs.updated',
      },
      orderBy: { createdAt: 'desc' },
    })

    const currentFAQs = (existingFAQs?.payload as any)?.faqs || []

    // Add new FAQ
    const updatedFAQs = [
      ...currentFAQs,
      { q: question, a: answer, addedAt: new Date().toISOString(), source: 'auto_generated' }
    ]

    // Save to EventLog
    await prisma.eventLog.create({
      data: {
        projectId,
        type: 'faqs.updated',
        payload: { faqs: updatedFAQs },
      },
    })

    // Trigger agent sync to push to AI
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      await fetch(`${appUrl}/api/agents/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
    } catch (syncError) {
      console.error('[AI Insights] Failed to sync agent:', syncError)
    }

    return NextResponse.json({ 
      success: true,
      message: 'FAQ added and synced to AI',
      totalFAQs: updatedFAQs.length,
    })
  } catch (error: any) {
    console.error('[AI Insights] Error saving FAQ:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to save FAQ' 
    }, { status: 500 })
  }
}

