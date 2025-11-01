import { prisma } from '@/lib/db'
import { createVapiClient, buildAssistantTools, buildAssistantPrompt } from '@/lib/vapi'

async function main() {
  const projectId = process.argv[2]
  if (!projectId) {
    console.error('Usage: tsx scripts/sync-assistant-tools.ts <projectId>')
    process.exit(1)
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new Error('Project not found')

  const agent = await prisma.agent.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } })
  if (!agent) throw new Error('Agent not found')

  const vapi = createVapiClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const tools = buildAssistantTools(appUrl, projectId)
  const system = buildAssistantPrompt(project.name, project.trade)

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

  console.log('Updated assistant tools for project', projectId, 'assistant', agent.vapiAssistantId)
}

main()
  .catch((err) => {
    console.error('Sync assistant failed:', err.response?.data || err.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
