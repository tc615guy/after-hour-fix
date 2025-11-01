import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { prisma } from '@/lib/db'

dotenvConfig({ path: '.env.local' })

async function main() {
  const projects = await prisma.project.findMany({
    include: {
      agents: true,
    }
  })

  console.log('Projects found:', projects.length)
  console.log('')

  for (const project of projects) {
    console.log('Project ID:', project.id)
    console.log('Name:', project.name)
    console.log('Trade:', project.trade)
    console.log('Timezone:', project.timezone)
    console.log('Owner Phone:', project.ownerPhone || 'Not set')
    console.log('Cal.com API Key:', project.calcomApiKey ? '✅ Connected' : '❌ Not connected')
    console.log('Cal.com User:', project.calcomUser || 'Not set')
    console.log('Agents:', project.agents.length)
    console.log('Auto-forward enabled:', project.autoForwardEnabled)
    console.log('Confidence threshold:', project.confidenceThreshold)
    console.log('')
  }
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
