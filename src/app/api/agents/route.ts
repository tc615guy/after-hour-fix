import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { buildAssistantPrompt } from '@/lib/vapi'
import { z } from 'zod'

const CreateAgentSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  voice: z.string().default('alloy'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = CreateAgentSchema.parse(body)

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Build system prompt for OpenAI Realtime
    const systemPrompt = buildAssistantPrompt(project.name, project.trade)

    // Create OpenAI Realtime agent (just DB record, no Vapi assistant)
    const agent = await prisma.agent.create({
      data: {
        projectId: input.projectId,
        vapiAssistantId: `openai-realtime-${Date.now()}`, // Placeholder, not used for OpenAI Realtime
        name: input.name,
        voice: input.voice,
        basePrompt: systemPrompt,
        systemType: 'openai-realtime', // Always OpenAI Realtime
      },
    })

    await prisma.eventLog.create({
      data: {
        projectId: input.projectId,
        type: 'agent.created',
        payload: { agentId: agent.id, systemType: 'openai-realtime' },
      },
    })

    return NextResponse.json({
      success: true,
      agent,
    })
  } catch (error: any) {
    console.error('Create agent error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
