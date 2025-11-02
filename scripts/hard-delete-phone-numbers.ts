#!/usr/bin/env tsx

import 'dotenv/config'
import { prisma } from '../src/lib/db'

async function main() {
  const numbersToDelete = process.argv.slice(2)

  if (numbersToDelete.length === 0) {
    console.error('❌ Usage: npx tsx scripts/hard-delete-phone-numbers.ts <number1> <number2> ...')
    console.error('   Example: npx tsx scripts/hard-delete-phone-numbers.ts +12055510112 +19168664042')
    process.exit(1)
  }

  console.log(`🗑️  Hard-deleting ${numbersToDelete.length} phone number(s)...\n`)

  for (const e164 of numbersToDelete) {
    try {
      const deleted = await prisma.phoneNumber.deleteMany({
        where: { e164 },
      })
      
      if (deleted.count > 0) {
        console.log(`✅ Deleted: ${e164}`)
      } else {
        console.log(`⚠️  Not found: ${e164}`)
      }
    } catch (error: any) {
      console.error(`❌ Error deleting ${e164}: ${error.message}`)
    }
  }

  console.log('\n✅ Done!')
}

main()
  .catch((error) => {
    console.error('❌ Script failed:', error.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

