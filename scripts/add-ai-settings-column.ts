import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL,
    },
  },
})

async function main() {
  console.log('Adding aiSettings column to Project table...')
  
  try {
    // Add aiSettings column to Project table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Project" 
      ADD COLUMN IF NOT EXISTS "aiSettings" JSON;
    `)
    console.log('✅ Added aiSettings column to Project table')
    
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
