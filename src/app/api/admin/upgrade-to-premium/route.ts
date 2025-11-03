import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantTools, buildAssistantPrompt } from '@/lib/vapi'
import { requireAdmin } from '@/lib/api-guard'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    console.log('[Admin] Upgrading Premium plan projects to premium stack...')
    
    // Get all Premium projects
    const projects = await prisma.project.findMany({
      where: { 
        plan: 'Premium',
        deletedAt: null,
      },
      include: { agents: true },
    })

    console.log(`[Admin] Found ${projects.length} Premium projects`)

    let successCount = 0
    const results: Array<{ agentId: string; name: string; project: string; success: boolean; error?: string }> = []

    for (const project of projects) {
      for (const agent of project.agents) {
        try {
          if (!agent || agent.deletedAt) continue

          const vapi = createVapiClient()
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
          const tools = buildAssistantTools(appUrl, agent.projectId)
          const system = buildAssistantPrompt(project.name, project.trade)

          console.log(`[Admin] Upgrading ${agent.name} (${project.name}) to premium stack`)

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

          results.push({ agentId: agent.id, name: agent.name, project: project.name, success: true })
          successCount++
          console.log(`[Admin] ✅ ${agent.name} (${project.name}) upgraded successfully`)
        } catch (error: any) {
          console.error(`[Admin] Failed to upgrade ${agent.name}:`, error.message)
          results.push({ agentId: agent.id, name: agent.name, project: project.name, success: false, error: error.message })
        }
      }
    }

    const totalAssistants = projects.reduce((sum, p) => sum + p.agents.length, 0)
    console.log(`[Admin] Upgrade complete: ${successCount} assistants upgraded for ${projects.length} Premium projects`)

    return NextResponse.json({ 
      success: true, 
      upgraded: successCount, 
      total: totalAssistants, 
      projects: projects.length,
      results 
    })
  } catch (error: any) {
    console.error('[Admin] Upgrade to premium error:', error)
    return NextResponse.json({ error: error.message || 'Failed to upgrade assistants' }, { status: 500 })
  }
}

