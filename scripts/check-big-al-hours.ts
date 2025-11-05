import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL,
    },
  },
})

async function main() {
  console.log('🔍 Checking Big Al\'s Plumbing business hours...\n')
  
  try {
    // Find Big Al's Plumbing project
    const project = await prisma.project.findFirst({
      where: {
        name: {
          contains: 'Big Al',
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        trade: true,
        timezone: true,
        businessHours: true,
      },
    })

    if (!project) {
      console.log('❌ Big Al\'s Plumbing not found')
      console.log('\n📋 All projects:')
      const allProjects = await prisma.project.findMany({
        select: {
          id: true,
          name: true,
          trade: true,
        },
      })
      allProjects.forEach(p => console.log(`  - ${p.name} (${p.trade})`))
      return
    }

    console.log(`✅ Found: ${project.name}`)
    console.log(`   ID: ${project.id}`)
    console.log(`   Trade: ${project.trade}`)
    console.log(`   Timezone: ${project.timezone}\n`)

    const businessHours = project.businessHours as any || {}
    
    if (!businessHours || Object.keys(businessHours).length === 0) {
      console.log('⚠️  No business hours configured (using defaults)\n')
      return
    }

    console.log('📅 Business Hours Configuration:')
    console.log('=' .repeat(50))
    
    const dayNames: { [key: string]: string } = {
      mon: 'Monday',
      tue: 'Tuesday',
      wed: 'Wednesday',
      thu: 'Thursday',
      fri: 'Friday',
      sat: 'Saturday',
      sun: 'Sunday',
    }

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    
    for (const day of days) {
      const dayConfig = businessHours[day] || {}
      const enabled = dayConfig.enabled ? '✅' : '❌'
      const open = dayConfig.open || '08:00'
      const close = dayConfig.close || '17:00'
      const dayName = dayNames[day] || day
      
      if (dayConfig.enabled) {
        console.log(`${enabled} ${dayName.padEnd(10)}: ${open} - ${close}`)
      } else {
        console.log(`${enabled} ${dayName.padEnd(10)}: Closed`)
      }
    }

    console.log('\n' + '='.repeat(50))
    
    // Calculate earliest open and latest close
    let earliestOpen = 24
    let latestClose = 0
    
    for (const day of days) {
      const dayConfig = businessHours[day]
      if (dayConfig?.enabled) {
        const openHour = parseInt((dayConfig.open || '08:00').split(':')[0])
        const closeHour = parseInt((dayConfig.close || '17:00').split(':')[0])
        earliestOpen = Math.min(earliestOpen, openHour)
        latestClose = Math.max(latestClose, closeHour)
      }
    }
    
    if (earliestOpen !== 24) {
      console.log(`\n⏰ Earliest Open: ${earliestOpen}:00`)
      console.log(`⏰ Latest Close: ${latestClose}:00`)
    }

    console.log('\n')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
