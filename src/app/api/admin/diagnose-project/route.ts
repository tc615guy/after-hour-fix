import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVapiClient } from '@/lib/vapi'
import axios from 'axios'
import { requireAdmin } from '@/lib/api-guard'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const body = await req.json().catch(() => ({}))
    const projectName = body.projectName || 'Josh\'s Heating'

    console.log(`[Admin] Diagnosing project: ${projectName}`)

    // Find project
    const project = await prisma.project.findFirst({
      where: {
        name: { contains: projectName, mode: 'insensitive' },
        deletedAt: null,
      },
      include: {
        agents: true,
        numbers: true,
        owner: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: `Project not found: ${projectName}` }, { status: 404 })
    }

    const diagnostics: any = {
      project: {
        id: project.id,
        name: project.name,
        trade: project.trade,
        plan: project.plan,
        ownerEmail: project.owner.email,
        calcomConnected: !!project.calcomApiKey,
        eventTypeId: project.calcomEventTypeId,
      },
      assistants: [],
      phoneNumbers: [],
      issues: [],
    }

    // Check assistants
    if (project.agents.length > 0) {
      const vapi = createVapiClient()
      for (const agent of project.agents) {
        try {
          const assistant = await vapi.getAssistant(agent.vapiAssistantId)
          const model: any = assistant?.model || {}
          
          const tools = model.tools || []
          const hasCorrectProjectId = tools.some((t: any) => 
            t.server?.url?.includes(`projectId=${project.id}`)
          )

          diagnostics.assistants.push({
            name: agent.name,
            vapiAssistantId: agent.vapiAssistantId,
            provider: model.provider,
            model: model.model,
            temperature: model.temperature,
            toolCount: tools.length,
            toolsCorrect: hasCorrectProjectId,
            tools: tools.map((t: any) => ({
              name: t.function?.name,
              url: t.server?.url,
              hasProjectId: t.server?.url?.includes(`projectId=${project.id}`),
            })),
          })

          if (!hasCorrectProjectId) {
            diagnostics.issues.push(`Assistant "${agent.name}" tools are not configured with correct projectId`)
          }
        } catch (error: any) {
          diagnostics.issues.push(`Failed to fetch assistant ${agent.name}: ${error.message}`)
        }
      }
    } else {
      diagnostics.issues.push('No assistants assigned to this project')
    }

    // Check Vapi phone numbers
    try {
      const apiKey = process.env.VAPI_API_KEY
      if (apiKey) {
        const http = axios.create({
          baseURL: 'https://api.vapi.ai',
          headers: { Authorization: `Bearer ${apiKey}` },
        })

        const resp = await http.get('/phone-number')
        const allNumbers: Array<{ id: string; number: string; assistantId?: string | null; provider?: string }> = resp.data

        if (project.numbers.length > 0) {
          for (const num of project.numbers) {
            const vapiNum = allNumbers.find(n => n.number === num.e164)
            if (vapiNum) {
              const expectedAssistant = project.agents[0]?.vapiAssistantId
              const isCorrect = vapiNum.assistantId === expectedAssistant

              diagnostics.phoneNumbers.push({
                number: num.e164,
                label: num.label,
                vapiNumberId: vapiNum.id,
                provider: vapiNum.provider,
                connectedAssistant: vapiNum.assistantId,
                expectedAssistant,
                isCorrect,
              })

              if (!isCorrect) {
                diagnostics.issues.push(`Phone number ${num.e164} connected to wrong assistant: ${vapiNum.assistantId} (expected ${expectedAssistant})`)
              }
            } else {
              diagnostics.issues.push(`Phone number ${num.e164} not found in Vapi account`)
            }
          }
        }
      }
    } catch (error: any) {
      diagnostics.issues.push(`Failed to check Vapi numbers: ${error.message}`)
    }

    console.log(`[Admin] Diagnostic complete. Issues: ${diagnostics.issues.length}`)

    return NextResponse.json(diagnostics)
  } catch (error: any) {
    console.error('[Admin] Diagnostic error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

