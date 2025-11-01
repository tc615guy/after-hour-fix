import 'dotenv/config'
import { prisma } from '../src/lib/db'
import { createVapiClient, buildAssistantPrompt, buildAssistantTools } from '../src/lib/vapi'

async function main() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const agentId = process.env.AGENT_ID

  let agent = null as any
  if (agentId) {
    agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { project: true }
    })
    if (!agent) throw new Error(`Agent not found: ${agentId}`)
  } else {
    agent = await prisma.agent.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { project: true }
    })
    if (!agent) throw new Error('No agents found')
  }

  const project = agent.project
  const prompt = buildAssistantPrompt(project.name, project.trade)
  const tools = buildAssistantTools(appUrl, agent.projectId)

  const vapi = createVapiClient()
  const current = await vapi.getAssistant(agent.vapiAssistantId)
  const provider = current?.model?.provider || 'openai'
  const modelName = current?.model?.model || 'gpt-4o-mini'

  const updated = await vapi.updateAssistant(agent.vapiAssistantId, {
    model: {
      provider,
      model: modelName,
      tools,
      systemPrompt: prompt
    },
  })

  console.log('✅ Updated assistant prompt for', agent.id)
  console.log('Project:', project.name)
  console.log('Trade:', project.trade)
  console.log('Assistant ID:', updated.id)
  console.log('\nPrompt preview (first 200 chars):')
  console.log(prompt.substring(0, 200) + '...')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
