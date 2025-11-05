import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Finding orphaned phone numbers (assigned to deleted projects)...\n')
  
  // Find all phone numbers where the project is deleted
  const orphanedNumbers = await prisma.phoneNumber.findMany({
    where: {
      deletedAt: null, // Phone number itself not deleted
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      },
    },
  })

  const orphaned = orphanedNumbers.filter(num => num.project.deletedAt !== null)

  console.log(`Found ${orphaned.length} orphaned phone number(s):\n`)
  console.log('='.repeat(80))

  if (orphaned.length === 0) {
    console.log('✅ No orphaned phone numbers found!')
    await prisma.$disconnect()
    return
  }

  for (const num of orphaned) {
    const deletedDate = num.project.deletedAt ? new Date(num.project.deletedAt).toLocaleString() : 'Unknown'
    console.log(`\n📞 ${num.e164}`)
    console.log(`   Assigned to: ${num.project.name} (${num.project.id})`)
    console.log(`   Project deleted: ${deletedDate}`)
    console.log(`   Label: ${num.label || 'N/A'}`)
    console.log(`   System Type: ${num.systemType || 'vapi'}`)
  }

  console.log(`\n` + '='.repeat(80))
  console.log(`\n⚠️  These phone numbers will be soft-deleted to prevent routing to deleted projects.\n`)

  const args = process.argv.slice(2)
  if (!args.includes('--fix')) {
    console.log('To clean them up, run with --fix flag:')
    console.log('   npx tsx scripts/cleanup-orphaned-phone-numbers.ts --fix')
    await prisma.$disconnect()
    return
  }

  console.log('🧹 Cleaning up orphaned phone numbers...\n')

  let cleaned = 0
  for (const num of orphaned) {
    await prisma.phoneNumber.update({
      where: { e164: num.e164 },
      data: {
        deletedAt: new Date(),
      },
    })
    cleaned++
    console.log(`✅ Cleaned up: ${num.e164} (was assigned to deleted project "${num.project.name}")`)
  }

  console.log(`\n✅ Cleaned up ${cleaned} orphaned phone number(s)!`)
  console.log('\nThese numbers are now soft-deleted and will not route calls.')
  console.log('They can be safely reassigned to new projects if needed.')

  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
