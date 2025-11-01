#!/usr/bin/env tsx

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.project.findMany({
    include: {
      numbers: true,
    },
  })

  console.log(`\nFound ${projects.length} project(s):\n`)

  for (const project of projects) {
    console.log(`📋 ${project.name} (${project.id})`)
    console.log(`   Phone numbers: ${project.numbers.length}`)

    if (project.numbers.length > 0) {
      project.numbers.forEach((num) => {
        console.log(`     - ${num.e164} (${num.label || 'Unlabeled'})`)
        console.log(`       Vapi Number ID: ${num.vapiNumberId}`)
      })
    } else {
      console.log(`     ⚠️  No phone numbers found`)
    }
    console.log('')
  }

  await prisma.$disconnect()
}

main()
