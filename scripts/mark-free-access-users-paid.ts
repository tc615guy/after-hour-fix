import { prisma } from '../src/lib/db'

const FREE_ACCESS_EMAILS = [
  'josh.lanius@gmail.com',
  'joshlanius@yahoo.com',
  'thundercatcrypto@gmail.com',
]

async function markFreeAccessUsersPaid() {
  console.log('Marking free access users as paid...')
  
  for (const email of FREE_ACCESS_EMAILS) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      })
      
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { setupFee: 'paid' },
        })
        console.log(`✓ ${email} - marked as paid`)
      } else {
        console.log(`⚠ ${email} - user not found (will be marked as paid when they sign up)`)
      }
    } catch (error) {
      console.error(`✗ ${email} - error:`, error)
    }
  }
  
  console.log('\nDone!')
}

markFreeAccessUsersPaid()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

