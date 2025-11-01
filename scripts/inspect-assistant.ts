import { prisma } from '@/lib/db'
import { createVapiClient } from '@/lib/vapi'

async function main() {
  const projectId = process.argv[2]
  if (!projectId) throw new Error('Usage: tsx scripts/inspect-assistant.ts <projectId>')
  const agent = await prisma.agent.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } })
  if (!agent) throw new Error('Agent not found for project ' + projectId)

  const vapi = createVapiClient()
  const a = await vapi.getAssistant(agent.vapiAssistantId)
  const model: any = (a as any).model || {}
  console.log('assistantId', agent.vapiAssistantId)
  console.log('provider', model.provider)
  console.log('model', model.model)
  console.log('tools', Array.isArray(model.tools) ? model.tools.map((t: any)=>({name:t?.function?.name, url:t?.server?.url})) : null)
}

main().catch((e) => {
  console.error('inspect failed', e.response?.data || e.message)
  process.exit(1)
}).finally(async()=>{ await prisma.$disconnect() })

