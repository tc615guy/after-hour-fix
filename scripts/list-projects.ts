#!/usr/bin/env tsx

import 'dotenv/config'
import { prisma } from '../src/lib/db'

async function main() {
  try {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        bookings: {
          where: { deletedAt: null },
        },
        technicians: {
          where: { deletedAt: null },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`\n📋 Found ${projects.length} project(s):\n`)

    projects.forEach((project) => {
      console.log(`Project: ${project.name}`)
      console.log(`  ID: ${project.id}`)
      console.log(`  Trade: ${project.trade}`)
      console.log(`  Technicians: ${project.technicians.length}`)
      console.log(`  Bookings: ${project.bookings.length}`)
      console.log('')
    })

    if (projects.length > 0) {
      console.log('💡 To delete all bookings from a project, run:')
      console.log('   npx tsx scripts/delete-all-bookings.ts <projectId> --force')
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

