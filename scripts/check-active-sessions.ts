import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking for active calls and recent call history\n')
  console.log('='.repeat(80))
  
  // Check recent calls for Big Al's Plumbing
  const bigAlProject = await prisma.project.findFirst({
    where: {
      name: {
        contains: 'Big Al',
        mode: 'insensitive',
      },
      deletedAt: null,
    },
    include: {
      calls: {
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
      agents: {
        where: { deletedAt: null },
      },
    },
  })
  
  if (!bigAlProject) {
    console.log('❌ Big Al\'s Plumbing project not found')
    await prisma.$disconnect()
    return
  }
  
  console.log(`\n📞 Recent calls for ${bigAlProject.name}:`)
  console.log(`   Found ${bigAlProject.calls.length} call(s) in last 30 minutes\n`)
  
  if (bigAlProject.calls.length > 0) {
    bigAlProject.calls.forEach((call, i) => {
      const timeAgo = Math.round((Date.now() - call.createdAt.getTime()) / 1000 / 60)
      console.log(`   ${i + 1}. Call ${call.vapiCallId || call.id}`)
      console.log(`      Status: ${call.status}`)
      console.log(`      From: ${call.fromNumber} → To: ${call.toNumber}`)
      console.log(`      Time: ${timeAgo} minutes ago`)
      console.log(`      Agent: ${call.agentId}`)
      if (call.transcript) {
        const transcriptPreview = call.transcript.substring(0, 100)
        if (transcriptPreview.toLowerCase().includes('turd')) {
          console.log(`      ⚠️  WARNING: Transcript contains "Turd"!`)
        }
        console.log(`      Transcript preview: ${transcriptPreview}...`)
      }
      console.log('')
    })
  } else {
    console.log('   No recent calls found')
  }
  
  // Check agent details
  console.log(`\n🤖 Agent Details:`)
  bigAlProject.agents.forEach(agent => {
    console.log(`   - ${agent.name} (${agent.id})`)
    console.log(`     System Type: ${agent.systemType || 'N/A'}`)
    console.log(`     Created: ${agent.createdAt}`)
    console.log(`     Updated: ${agent.updatedAt}`)
    
    // Check basePrompt for "Turd"
    if (agent.basePrompt.includes('Big Turd') || agent.basePrompt.includes('Turd')) {
      console.log(`     ⚠️  WARNING: basePrompt contains "Turd"!`)
      console.log(`     basePrompt preview: ${agent.basePrompt.substring(0, 150)}...`)
    } else {
      console.log(`     ✅ basePrompt is clean`)
      console.log(`     basePrompt preview: ${agent.basePrompt.substring(0, 150)}...`)
    }
  })
  
  console.log('\n' + '='.repeat(80))
  console.log('\n💡 RECOMMENDATIONS:')
  console.log('   1. Restart the OpenAI Realtime server to clear any cached sessions')
  console.log('   2. If server is on Render/Railway, trigger a redeploy')
  console.log('   3. Make a new test call after restart')
  console.log('   4. Check server logs for which agent is being loaded')
  
  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
