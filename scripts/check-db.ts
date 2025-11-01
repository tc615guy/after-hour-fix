import { prisma } from '../src/lib/db'

async function main() {
  const projects = await prisma.project.findMany({
    include: {
      agents: true,
      numbers: true,
    },
  })

  console.log('=== PROJECTS IN DATABASE ===')
  for (const project of projects) {
    console.log(`\nProject: ${project.name} (ID: ${project.id})`)
    console.log(`  Trade: ${project.trade}`)
    console.log(`  Agents:`)
    for (const agent of project.agents) {
      console.log(`    - ${agent.name} (Vapi ID: ${agent.vapiAssistantId})`)
    }
    console.log(`  Phone Numbers:`)
    for (const phone of project.numbers) {
      console.log(`    - ${phone.e164} (${phone.label})`)
    }
  }

  await prisma.$disconnect()
}

main()
