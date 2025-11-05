import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { buildAssistantPrompt } from '../src/lib/vapi'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  
  // Find Big Al's Plumbing project and agent
  const project = await prisma.project.findFirst({
    where: {
      name: {
        contains: 'Big Al',
        mode: 'insensitive',
      },
      deletedAt: null,
    },
    include: {
      agents: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!project) {
    console.error('❌ Big Al\'s Plumbing project not found')
    process.exit(1)
  }

  if (project.agents.length === 0) {
    console.error('❌ No active agents found for Big Al\'s Plumbing')
    process.exit(1)
  }

  const agent = project.agents[0]
  
  console.log(`🔧 Updating agent prompt for: ${project.name}`)
  console.log(`   Agent ID: ${agent.id}`)
  console.log(`   Current basePrompt preview: ${agent.basePrompt.substring(0, 100)}...`)
  
  // Check if it contains "Turd"
  if (agent.basePrompt.includes('Big Turd') || agent.basePrompt.includes('Turd')) {
    console.log(`\n   ⚠️  WARNING: Current prompt contains "Turd"!`)
  }
  
  // Build fresh prompt
  const freshPrompt = buildAssistantPrompt(project.name, project.trade)
  console.log(`\n   New basePrompt preview: ${freshPrompt.substring(0, 100)}...`)
  
  if (!args.includes('--yes')) {
    console.log(`\n⚠️  This will update the agent's basePrompt in the database.`)
    console.log(`   To confirm, run with --yes flag:`)
    console.log(`   npx tsx scripts/fix-agent-prompt.ts --yes`)
    await prisma.$disconnect()
    return
  }
  
  // Update the agent
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      basePrompt: freshPrompt,
    },
  })
  
  console.log(`\n✅ Agent basePrompt updated!`)
  console.log(`\n⚠️  IMPORTANT: The OpenAI Realtime server may need to be restarted`)
  console.log(`   for this change to take effect. The server builds the system prompt`)
  console.log(`   dynamically from project.name, but may cache agent data.`)
  
  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
