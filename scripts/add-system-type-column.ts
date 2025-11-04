import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

// Use DATABASE_URL directly (pooled connection with pgbouncer=true)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL,
    },
  },
})

async function main() {
  console.log('Adding systemType columns to Agent and PhoneNumber tables...')
  
  try {
    // Add systemType to Agent table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Agent" 
      ADD COLUMN IF NOT EXISTS "systemType" TEXT NOT NULL DEFAULT 'vapi';
    `)
    console.log('✅ Added systemType column to Agent table')
    
    // Add systemType to PhoneNumber table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PhoneNumber" 
      ADD COLUMN IF NOT EXISTS "systemType" TEXT NOT NULL DEFAULT 'vapi';
    `)
    console.log('✅ Added systemType column to PhoneNumber table')
    
    console.log('✅ Migration complete!')
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
