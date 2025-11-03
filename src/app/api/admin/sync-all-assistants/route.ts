import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantTools, buildAssistantPrompt } from '@/lib/vapi'
import { requireAdmin } from '@/lib/api-guard'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    console.log('[Admin] Syncing all assistants...')
    
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' },
    })

    console.log(`[Admin] Found ${agents.length} assistants to sync`)

    let successCount = 0
    const results: Array<{ agentId: string; name: string; success: boolean; error?: string }> = []

    for (const agent of agents) {
      try {
        const project = await prisma.project.findUnique({ where: { id: agent.projectId } })
        if (!project) {
          results.push({ agentId: agent.id, name: agent.name, success: false, error: 'Project not found' })
          continue
        }

        const vapi = createVapiClient()
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
        const tools = buildAssistantTools(appUrl, agent.projectId)
        const system = buildAssistantPrompt(project.name, project.trade)

        console.log(`[Admin] Syncing ${agent.name} with ${tools.length} tools`)

        const current = await vapi.getAssistant(agent.vapiAssistantId)
        const existingModel = (current as any).model || {}
        const provider = existingModel.provider || 'openai'
        const modelName = existingModel.model || 'gpt-4o-mini'

        await vapi.updateAssistant(agent.vapiAssistantId, {
          model: {
            provider,
            model: modelName,
            temperature: existingModel.temperature ?? 0.7,
            messages: [{ role: 'system', content: system } as any],
            tools,
          },
        } as any)

        await prisma.eventLog.create({
          data: { projectId: agent.projectId, type: 'agent.synced', payload: { agentId: agent.id } },
        })

        results.push({ agentId: agent.id, name: agent.name, success: true })
        successCount++
      } catch (error: any) {
        console.error(`[Admin] Failed to sync ${agent.name}:`, error.message)
        results.push({ agentId: agent.id, name: agent.name, success: false, error: error.message })
      }
    }

    console.log(`[Admin] Sync complete: ${successCount}/${agents.length} assistants updated`)

    return NextResponse.json({ 
      success: true, 
      synced: successCount, 
      total: agents.length, 
      results 
    })
  } catch (error: any) {
    console.error('[Admin] Sync all assistants error:', error)
    return NextResponse.json({ error: error.message || 'Failed to sync assistants' }, { status: 500 })
  }
}

