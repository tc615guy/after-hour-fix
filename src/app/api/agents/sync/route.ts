import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantPrompt, buildAssistantTools } from '@/lib/vapi'

export async function POST(req: NextRequest) {
  try {
    const { projectId, agentId } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const agent = agentId
      ? await prisma.agent.findUnique({ where: { id: agentId } })
      : await prisma.agent.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } })

    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const vapi = createVapiClient()
    const system = buildAssistantPrompt(project.name, project.trade)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const tools = buildAssistantTools(appUrl, projectId)

    await vapi.updateAssistant(agent.vapiAssistantId, {
      model: {
        messages: [{ role: 'system', content: system }],
        tools,
      },
    } as any)

    await prisma.eventLog.create({
      data: { projectId, type: 'agent.synced', payload: { agentId: agent.id } },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to sync assistant' }, { status: 500 })
  }
}

