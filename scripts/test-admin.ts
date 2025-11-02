#!/usr/bin/env tsx

import 'dotenv/config'
import { prisma } from '../src/lib/db'

async function main() {
  try {
    console.log('🔍 Checking admin users...')
    const adminUsers = await prisma.user.findMany({ where: { role: 'admin' } })
    console.log(`Found ${adminUsers.length} admin users:`)
    adminUsers.forEach(u => console.log(`  - ${u.email} (${u.role})`))
    
    console.log('\n🔍 Checking all users...')
    const allUsers = await prisma.user.findMany()
    console.log(`Total users: ${allUsers.length}`)
    allUsers.forEach(u => console.log(`  - ${u.email} (role: ${u.role || 'none'})`))
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()

