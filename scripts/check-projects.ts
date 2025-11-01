#!/usr/bin/env tsx

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      trade: true,
      calcomApiKey: true,
      calcomEventTypeId: true,
    },
  })

  console.log(`\nFound ${projects.length} project(s):\n`)

  projects.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`)
    console.log(`   ID: ${p.id}`)
    console.log(`   Trade: ${p.trade}`)
    console.log(`   Cal.com connected: ${p.calcomApiKey ? 'Yes' : 'No'}`)
    console.log(`   Event Type ID: ${p.calcomEventTypeId || 'N/A'}`)
    console.log('')
  })

  await prisma.$disconnect()
}

main()
