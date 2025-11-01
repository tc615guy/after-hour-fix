#!/usr/bin/env tsx

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const demoPlumbing = await prisma.project.findUnique({
    where: { id: 'demo-project' },
    include: { owner: true },
  })

  if (demoPlumbing) {
    console.log('Demo Plumbing Owner:')
    console.log('  User ID:', demoPlumbing.ownerId)
    console.log('  Email:', demoPlumbing.owner.email)
    console.log('  Name:', demoPlumbing.owner.name)
  }

  await prisma.$disconnect()
}

main()
