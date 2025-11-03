#!/usr/bin/env tsx

import 'dotenv/config'
import { prisma } from '../src/lib/db'

async function main() {
  const projectId = process.argv[2]

  if (!projectId) {
    console.error('❌ Usage: npx tsx scripts/delete-all-bookings.ts <projectId>')
    console.error('   Example: npx tsx scripts/delete-all-bookings.ts cmhi1nvid0001la04rg1x77ob')
    process.exit(1)
  }

  try {
    console.log(`🔍 Looking for project: ${projectId}`)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        bookings: true,
      },
    })

    if (!project) {
      console.error(`❌ Project not found`)
      process.exit(1)
    }

    console.log(`\n   Project: ${project.name}`)
    console.log(`   Bookings: ${project.bookings.length}`)

    if (project.bookings.length === 0) {
      console.log('\n✅ No bookings to delete')
      process.exit(0)
    }

    // Check if --force flag provided
    const forceDelete = process.argv.includes('--force')
    
    if (!forceDelete) {
      console.log('\n⚠️  To delete all bookings, run with --force flag:')
      console.log(`   npx tsx scripts/delete-all-bookings.ts ${projectId} --force`)
      process.exit(0)
    }

    // Soft delete all bookings (set deletedAt timestamp)
    const result = await prisma.booking.updateMany({
      where: { 
        projectId,
        deletedAt: null // Only delete bookings that aren't already deleted
      },
      data: { deletedAt: new Date() },
    })

    console.log(`\n✅ ${result.count} booking(s) soft-deleted successfully!`)
    console.log('   They will no longer appear in queries but data is preserved.')
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

