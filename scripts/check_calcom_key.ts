import 'dotenv/config'
import { prisma } from '../src/lib/db'

async function main() {
  const project = await prisma.project.findFirst({
    where: { name: 'Demo Plumbing' }
  })

  if (!project) {
    console.log('Demo Plumbing project not found')
    return
  }

  console.log('Project:', project.name)
  console.log('Trade:', project.trade)
  console.log('Cal.com API Key:', project.calcomApiKey ? `${project.calcomApiKey.substring(0, 20)}...` : 'NOT SET')
  console.log('Cal.com Username:', project.calcomUser || 'NOT SET')
  console.log('\nFull API Key (for debugging):')
  console.log(project.calcomApiKey || 'NULL')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
