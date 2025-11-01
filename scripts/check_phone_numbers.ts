import 'dotenv/config'
import { prisma } from '../src/lib/db'

async function main() {
  const numbers = await prisma.phoneNumber.findMany({
    include: {
      project: {
        include: {
          agents: true
        }
      }
    }
  })

  console.log(`Total phone numbers: ${numbers.length}\n`)

  for (const num of numbers) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Phone:', num.e164)
    console.log('Label:', num.label || 'N/A')
    console.log('Project:', num.project.name)
    console.log('Trade:', num.project.trade)
    console.log('Agents:', num.project.agents.length)
    if (num.project.agents.length > 0) {
      console.log('Latest Agent:', num.project.agents[0].name)
    }
    console.log()
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
