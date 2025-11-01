#!/usr/bin/env tsx

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createAdminUsers() {
  const adminEmails = [
    'joshlanius@yahoo.com',
    'josh.lanius@gmail.com',
  ]

  try {
    for (const email of adminEmails) {
      console.log(`\n🔍 Checking ${email}...`)

      const existing = await prisma.user.findUnique({
        where: { email },
      })

      if (existing) {
        if (existing.role === 'admin') {
          console.log(`   ✅ Already an admin`)
        } else {
          await prisma.user.update({
            where: { email },
            data: { role: 'admin' },
          })
          console.log(`   ✅ Updated to admin`)
        }
      } else {
        await prisma.user.create({
          data: {
            email,
            name: 'Josh Lanius',
            role: 'admin',
          },
        })
        console.log(`   ✅ Created as admin`)
      }
    }

    console.log('\n🎉 Admin users ready!')
    console.log('   - joshlanius@yahoo.com')
    console.log('   - josh.lanius@gmail.com')
    console.log('\n📝 Note: These accounts will be fully activated when they sign in via NextAuth')
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUsers()
