#!/usr/bin/env tsx

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'josh.lanius@gmail.com' },
    include: {
      projects: true
    }
  })

  if (!user) {
    console.log('❌ User NOT found in Prisma database')
    console.log('This means Supabase auth worked, but user not synced to Prisma')
  } else {
    console.log('✅ User found in Prisma:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name || 'N/A'}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Projects: ${user.projects.length}`)

    if (user.projects.length > 0) {
      console.log('\n   Projects:')
      user.projects.forEach(p => {
        console.log(`   - ${p.name} (${p.id})`)
      })
    }
  }

  await prisma.$disconnect()
}

checkUser()
