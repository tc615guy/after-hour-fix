#!/usr/bin/env tsx

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking all phone numbers and their project assignments...\n')
  
  const numbers = await prisma.phoneNumber.findMany({
    include: {
      project: {
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log(`Found ${numbers.length} phone number records:\n`)
  console.log('='.repeat(80))
  
  for (const num of numbers) {
    const projectStatus = num.project.deletedAt ? '❌ DELETED' : '✅ ACTIVE'
    const projectName = num.project.name || 'UNNAMED'
    
    console.log(`\n📞 ${num.e164}`)
    console.log(`   Label: ${num.label || 'N/A'}`)
    console.log(`   Project: ${projectName} (${num.project.id}) - ${projectStatus}`)
    if (num.project.deletedAt) {
      console.log(`   Deleted at: ${num.project.deletedAt}`)
    }
    console.log(`   System Type: ${num.systemType || 'vapi'}`)
    console.log(`   Created: ${num.createdAt}`)
    console.log(`   Deleted: ${num.deletedAt || 'NO'}`)
  }

  // Check for duplicate e164 numbers
  const e164Counts = numbers.reduce((acc, num) => {
    acc[num.e164] = (acc[num.e164] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const duplicates = Object.entries(e164Counts).filter(([_, count]) => count > 1)
  if (duplicates.length > 0) {
    console.log(`\n⚠️  DUPLICATE e164 NUMBERS FOUND:\n`)
    for (const [e164, count] of duplicates) {
      console.log(`   ${e164}: ${count} records`)
      const dupNumbers = numbers.filter(n => n.e164 === e164)
      dupNumbers.forEach(n => {
        console.log(`      - ${n.project.name} (${n.project.deletedAt ? 'DELETED' : 'ACTIVE'})`)
      })
    }
  }

  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
