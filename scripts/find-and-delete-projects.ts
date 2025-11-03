#!/usr/bin/env tsx

import 'dotenv/config'
import { prisma } from '../src/lib/db'

async function main() {
  const projectNames = ['JB Plumbing', 'Big Daddy Plumbing']
  
  console.log(`🔍 Looking for projects: ${projectNames.join(', ')}\n`)

  for (const name of projectNames) {
    const projects = await prisma.project.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive'
        }
      },
      include: {
        agents: true,
        numbers: true,
        calls: true,
        bookings: true,
        technicians: true,
      },
    })

    if (projects.length === 0) {
      console.log(`❌ Project "${name}" not found`)
      continue
    }

    for (const project of projects) {
      console.log(`\n📋 Found: ${project.name}`)
      console.log(`   ID: ${project.id}`)
      console.log(`   Trade: ${project.trade}`)
      console.log(`   Agents: ${project.agents.length}`)
      console.log(`   Numbers: ${project.numbers.length}`)
      console.log(`   Calls: ${project.calls.length}`)
      console.log(`   Bookings: ${project.bookings.length}`)
      console.log(`   Technicians: ${project.technicians.length}`)
      
      // Soft delete
      await prisma.project.update({
        where: { id: project.id },
        data: { deletedAt: new Date() },
      })
      
      console.log(`   ✅ Soft-deleted`)
    }
  }
  
  console.log('\n✅ Done!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

