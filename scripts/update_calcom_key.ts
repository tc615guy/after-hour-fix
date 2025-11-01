import 'dotenv/config'
import { prisma } from '../src/lib/db'

async function main() {
  const apiKey = 'cal_live_d8a2c04bca21c7036335456c0a0d788e'

  // First find the project
  const existingProject = await prisma.project.findFirst({
    where: { name: 'Demo Plumbing' }
  })

  if (!existingProject) {
    console.log('❌ Demo Plumbing project not found')
    return
  }

  // Update by ID
  const project = await prisma.project.update({
    where: { id: existingProject.id },
    data: { calcomApiKey: apiKey }
  })

  console.log('✅ Updated Demo Plumbing project')
  console.log('Project:', project.name)
  console.log('Trade:', project.trade)
  console.log('Cal.com API Key:', `${apiKey.substring(0, 20)}...`)
  console.log('\n✅ Cal.com integration should now work with real bookings!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
