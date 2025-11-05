import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const phoneNumberE164 = '+12058594459'
  
  console.log('🔍 DEBUGGING PHONE ROUTING ISSUE\n')
  console.log('='.repeat(80))
  
  // 1. Check all phone numbers matching this E164 (including deleted)
  console.log('\n1️⃣  Checking ALL phone number records for:', phoneNumberE164)
  const allNumbers = await prisma.phoneNumber.findMany({
    where: { e164: phoneNumberE164 },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      },
    },
  })
  
  console.log(`   Found ${allNumbers.length} phone number record(s):`)
  allNumbers.forEach((num, i) => {
    console.log(`   ${i + 1}. Project: ${num.project.name} (${num.project.id})`)
    console.log(`      Phone Deleted: ${num.deletedAt ? 'YES ❌' : 'NO ✅'}`)
    console.log(`      Project Deleted: ${num.project.deletedAt ? 'YES ❌' : 'NO ✅'}`)
    console.log(`      System Type: ${num.systemType || 'N/A'}`)
  })
  
  // 2. Check what the server lookup would find (active only)
  console.log('\n2️⃣  Simulating server lookup (active phone numbers + active projects only):')
  const serverLookup = await prisma.phoneNumber.findFirst({
    where: { 
      e164: phoneNumberE164,
      deletedAt: null,
      project: {
        deletedAt: null,
      },
    },
    include: {
      project: {
        include: {
          agents: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  })
  
  if (serverLookup) {
    console.log(`   ✅ Server would find:`)
    console.log(`      Project: ${serverLookup.project.name} (${serverLookup.project.id})`)
    console.log(`      Agent: ${serverLookup.project.agents[0]?.name || 'NO AGENT'} (${serverLookup.project.agents[0]?.id || 'N/A'})`)
    if (serverLookup.project.agents[0]) {
      const agent = serverLookup.project.agents[0]
      console.log(`      Agent basePrompt preview: ${agent.basePrompt.substring(0, 100)}...`)
      console.log(`      Agent systemType: ${agent.systemType || 'N/A'}`)
    }
  } else {
    console.log(`   ❌ Server lookup found NOTHING (this would cause routing error)`)
  }
  
  // 3. Check for any projects with "Big Turd" or "Turd" in the name
  console.log('\n3️⃣  Checking for projects with "Turd" in the name:')
  const turdProjects = await prisma.project.findMany({
    where: {
      name: {
        contains: 'Turd',
        mode: 'insensitive',
      },
    },
    include: {
      numbers: {
        where: { deletedAt: null },
      },
      agents: {
        where: { deletedAt: null },
      },
    },
  })
  
  console.log(`   Found ${turdProjects.length} project(s) with "Turd" in name:`)
  turdProjects.forEach((proj, i) => {
    console.log(`   ${i + 1}. ${proj.name} (${proj.id})`)
    console.log(`      Deleted: ${proj.deletedAt ? 'YES ❌' : 'NO ✅'}`)
    console.log(`      Phone Numbers: ${proj.numbers.length}`)
    proj.numbers.forEach(num => {
      console.log(`         - ${num.e164}`)
    })
    console.log(`      Agents: ${proj.agents.length}`)
    proj.agents.forEach(agent => {
      console.log(`         - ${agent.name} (${agent.id}, systemType: ${agent.systemType || 'N/A'})`)
      console.log(`           basePrompt preview: ${agent.basePrompt.substring(0, 80)}...`)
    })
  })
  
  // 4. Check all "Big Al" projects
  console.log('\n4️⃣  Checking for projects with "Big Al" in the name:')
  const bigAlProjects = await prisma.project.findMany({
    where: {
      name: {
        contains: 'Big Al',
        mode: 'insensitive',
      },
    },
    include: {
      numbers: {
        where: { deletedAt: null },
      },
      agents: {
        where: { deletedAt: null },
      },
    },
  })
  
  console.log(`   Found ${bigAlProjects.length} project(s) with "Big Al" in name:`)
  bigAlProjects.forEach((proj, i) => {
    console.log(`   ${i + 1}. ${proj.name} (${proj.id})`)
    console.log(`      Deleted: ${proj.deletedAt ? 'YES ❌' : 'NO ✅'}`)
    console.log(`      Phone Numbers: ${proj.numbers.length}`)
    proj.numbers.forEach(num => {
      console.log(`         - ${num.e164} (${num.label || 'Main'})`)
    })
    console.log(`      Agents: ${proj.agents.length}`)
    proj.agents.forEach(agent => {
      console.log(`         - ${agent.name} (${agent.id}, systemType: ${agent.systemType || 'N/A'})`)
      console.log(`           basePrompt preview: ${agent.basePrompt.substring(0, 80)}...`)
      // Check if basePrompt contains "Big Turd"
      if (agent.basePrompt.includes('Big Turd') || agent.basePrompt.includes('Turd')) {
        console.log(`           ⚠️  WARNING: basePrompt contains "Turd"!`)
      }
    })
  })
  
  // 5. Check if there are multiple active agents that could be loaded
  console.log('\n5️⃣  Checking for duplicate or conflicting agent assignments:')
  if (serverLookup && serverLookup.project.agents.length > 1) {
    console.log(`   ⚠️  WARNING: Project has ${serverLookup.project.agents.length} active agents!`)
    serverLookup.project.agents.forEach((agent, i) => {
      console.log(`      ${i + 1}. ${agent.name} (${agent.id})`)
      console.log(`         Created: ${agent.createdAt}`)
      console.log(`         basePrompt preview: ${agent.basePrompt.substring(0, 80)}...`)
    })
  } else {
    console.log(`   ✅ Project has exactly ${serverLookup?.project.agents.length || 0} active agent(s)`)
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('\n💡 RECOMMENDATIONS:')
  
  if (turdProjects.length > 0 && turdProjects.some(p => !p.deletedAt)) {
    console.log('   ❌ Found ACTIVE project with "Turd" in name - this needs to be deleted!')
  }
  
  if (serverLookup && serverLookup.project.agents[0]) {
    const agent = serverLookup.project.agents[0]
    if (agent.basePrompt.includes('Big Turd') || agent.basePrompt.includes('Turd')) {
      console.log('   ❌ Agent basePrompt contains "Turd" - needs to be updated!')
      console.log('   📝 Run: npx tsx scripts/update-agent-prompt.ts <agentId>')
    }
  }
  
  if (allNumbers.length > 1) {
    console.log('   ⚠️  Multiple phone number records found - may need cleanup')
  }
  
  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
