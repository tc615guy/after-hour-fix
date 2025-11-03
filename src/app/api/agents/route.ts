import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantPrompt, buildAssistantTools } from '@/lib/vapi'
import { z } from 'zod'

const CreateAgentSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  voice: z.string().default('adam'),
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

    const vapiClient = createVapiClient()
    const systemPrompt = buildAssistantPrompt(project.name, project.trade)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const tools = buildAssistantTools(appUrl, project.id)

    const vapiAssistant = await vapiClient.createAssistant({
      name: input.name,
      firstMessage: "Hey there, thanks for calling! I can help you right away. What's going on?",
      voice: {
        provider: 'cartesia',
        voiceId: 'ec1e269e-9ca0-402f-8a18-58e0e022355a', // Ariana - FREE voice
        model: 'sonic-3',
        language: 'en',
      },
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini', // Standard model - balance cost and quality
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
        ],
        tools,
      },
      recordingEnabled: true, // Enable call recording for playback & demos
    })

    const agent = await prisma.agent.create({
      data: {
        projectId: input.projectId,
        vapiAssistantId: vapiAssistant.id,
        name: input.name,
        voice: input.voice,
        basePrompt: systemPrompt,
      },
    })

    await prisma.eventLog.create({
      data: {
        projectId: input.projectId,
        type: 'agent.created',
        payload: { agentId: agent.id, vapiAssistantId: vapiAssistant.id },
      },
    })

    return NextResponse.json({
      success: true,
      agent,
      vapiAssistantId: vapiAssistant.id,
    })
  } catch (error: any) {
    console.error('Create agent error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
