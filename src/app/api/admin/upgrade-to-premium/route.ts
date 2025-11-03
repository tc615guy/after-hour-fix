import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantTools, buildAssistantPrompt } from '@/lib/vapi'
import { requireAdmin } from '@/lib/api-guard'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    console.log('[Admin] Upgrading all assistants to premium stack...')
    
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' },
    })

    console.log(`[Admin] Found ${agents.length} assistants to upgrade`)

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

        console.log(`[Admin] Upgrading ${agent.name} to premium stack`)

        await vapi.updateAssistant(agent.vapiAssistantId, {
          model: {
            provider: 'openai',
            model: 'gpt-4o', // Premium model for best function calling and reasoning
            temperature: 0.7,
            messages: [{ role: 'system', content: system } as any],
            tools,
          },
          voice: {
            provider: '11labs',
            voiceId: 'burt', // Professional, warm male voice from ElevenLabs
          },
          transcriber: {
            provider: 'deepgram',
            model: 'nova-2', // Best accuracy transcription
            language: 'en',
          },
        } as any)

        await prisma.eventLog.create({
          data: { 
            projectId: agent.projectId, 
            type: 'agent.upgraded',
            payload: { 
              agentId: agent.id,
              stack: 'gpt-4o, elevenlabs-burt, deepgram-nova-2'
            }
          },
        })

        results.push({ agentId: agent.id, name: agent.name, success: true })
        successCount++
        console.log(`[Admin] ✅ ${agent.name} upgraded successfully`)
      } catch (error: any) {
        console.error(`[Admin] Failed to upgrade ${agent.name}:`, error.message)
        results.push({ agentId: agent.id, name: agent.name, success: false, error: error.message })
      }
    }

    console.log(`[Admin] Upgrade complete: ${successCount}/${agents.length} assistants upgraded`)

    return NextResponse.json({ 
      success: true, 
      upgraded: successCount, 
      total: agents.length, 
      results 
    })
  } catch (error: any) {
    console.error('[Admin] Upgrade to premium error:', error)
    return NextResponse.json({ error: error.message || 'Failed to upgrade assistants' }, { status: 500 })
  }
}

