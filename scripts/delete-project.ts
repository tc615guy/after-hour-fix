#!/usr/bin/env tsx

import 'dotenv/config'
import { prisma } from '../src/lib/db'

async function main() {
  const projectId = process.argv[2]

  if (!projectId) {
    console.error('❌ Usage: npx tsx scripts/delete-project.ts <projectId>')
    console.error('   Example: npx tsx scripts/delete-project.ts cmhi1nvid0001la04rg1x77ob')
    process.exit(1)
  }

  try {
    console.log(`🔍 Looking for project: ${projectId}`)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        agents: true,
        numbers: true,
        calls: true,
        bookings: true,
      },
    })

    if (!project) {
      console.error(`❌ Project not found`)
      process.exit(1)
    }

    console.log(`\n   Project: ${project.name}`)
    console.log(`   Trade: ${project.trade}`)
    console.log(`   Agents: ${project.agents.length}`)
    console.log(`   Numbers: ${project.numbers.length}`)
    console.log(`   Calls: ${project.calls.length}`)
    console.log(`   Bookings: ${project.bookings.length}`)

    // Check if --force flag provided
    const forceDelete = process.argv.includes('--force')
    
    if (!forceDelete) {
      console.log('\n⚠️  To delete, run with --force flag:')
      console.log(`   npx tsx scripts/delete-project.ts ${projectId} --force`)
      process.exit(0)
    }

    // Soft delete (set deletedAt timestamp)
    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    })

    console.log('\n✅ Project soft-deleted successfully!')
    console.log('   It will no longer appear in queries but data is preserved.')
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

