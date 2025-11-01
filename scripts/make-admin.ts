#!/usr/bin/env tsx

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function makeAdmin() {
  const email = process.argv[2]

  if (!email) {
    console.error('❌ Usage: npx tsx scripts/make-admin.ts <email>')
    console.error('   Example: npx tsx scripts/make-admin.ts your@email.com')
    process.exit(1)
  }

  try {
    console.log(`🔍 Looking for user with email: ${email}`)

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.error(`❌ User not found with email: ${email}`)
      console.log('\n💡 Available users:')
      const allUsers = await prisma.user.findMany({
        select: { email: true, name: true, role: true },
      })
      allUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.name || 'No name'}) - ${u.role}`)
      })
      process.exit(1)
    }

    if (user.role === 'admin') {
      console.log(`✅ User ${email} is already an admin!`)
      process.exit(0)
    }

    await prisma.user.update({
      where: { email },
      data: { role: 'admin' },
    })

    console.log(`✅ Successfully made ${email} an admin!`)
    console.log(`\n🎉 You can now access the admin dashboard at: http://localhost:3001/admin`)
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

makeAdmin()
