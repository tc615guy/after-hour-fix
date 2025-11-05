import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/projects/:id/ai-settings
 * Get AI settings for a project
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const project = await prisma.project.findUnique({
      where: { id },
      select: { aiSettings: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      settings: project.aiSettings || {} 
    })
  } catch (error: any) {
    console.error('[AI Settings GET] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to load AI settings' 
    }, { status: 500 })
  }
}

/**
 * PUT /api/projects/:id/ai-settings
 * Update AI settings for a project
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { settings } = await req.json()

    // Validate settings
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })
    }

    // Validate specific fields to prevent breaking the AI
    if (settings.temperature !== undefined) {
      const temp = parseFloat(settings.temperature)
      if (isNaN(temp) || temp < 0.1 || temp > 1.0) {
        return NextResponse.json({ 
          error: 'Temperature must be between 0.1 and 1.0' 
        }, { status: 400 })
      }
    }

    if (settings.maxResponseLength !== undefined) {
      const length = parseInt(settings.maxResponseLength)
      if (isNaN(length) || length < 50 || length > 300) {
        return NextResponse.json({ 
          error: 'Max response length must be between 50 and 300' 
        }, { status: 400 })
      }
    }

    if (settings.silenceTimeout !== undefined) {
      const timeout = parseInt(settings.silenceTimeout)
      if (isNaN(timeout) || timeout < 1000 || timeout > 10000) {
        return NextResponse.json({ 
          error: 'Silence timeout must be between 1000 and 10000 ms' 
        }, { status: 400 })
      }
    }

    // Update project with new AI settings
    const project = await prisma.project.update({
      where: { id },
      data: { aiSettings: settings },
    })

    // Log the change
    await prisma.eventLog.create({
      data: {
        type: 'ai_settings.updated',
        projectId: id,
        payload: { settings },
      },
    })

    return NextResponse.json({ 
      success: true,
      settings: project.aiSettings 
    })
  } catch (error: any) {
    console.error('[AI Settings PUT] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update AI settings' 
    }, { status: 500 })
  }
}

