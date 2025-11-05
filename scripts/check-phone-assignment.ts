import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const phoneNumber = await prisma.phoneNumber.findFirst({
    where: { e164: '+12058594459' },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      },
    },
  })

  if (!phoneNumber) {
    console.log('❌ Phone number +12058594459 not found')
    await prisma.$disconnect()
    return
  }

  console.log('📞 Phone Number Assignment:')
  console.log(`   E164: ${phoneNumber.e164}`)
  console.log(`   Project: ${phoneNumber.project.name} (${phoneNumber.project.id})`)
  console.log(`   Project Deleted: ${phoneNumber.project.deletedAt ? 'YES ❌' : 'NO ✅'}`)
  console.log(`   Phone Number Deleted: ${phoneNumber.deletedAt ? 'YES ❌' : 'NO ✅'}`)
  console.log(`   System Type: ${phoneNumber.systemType || 'N/A'}`)

  // Check for other phone numbers assigned to Big Al's Plumbing
  const bigAlProject = await prisma.project.findFirst({
    where: {
      name: {
        contains: 'Big Al',
        mode: 'insensitive',
      },
      deletedAt: null,
    },
    include: {
      numbers: {
        where: { deletedAt: null },
      },
    },
  })

  if (bigAlProject) {
    console.log(`\n✅ Big Al's Plumbing has ${bigAlProject.numbers.length} active number(s):`)
    bigAlProject.numbers.forEach(num => {
      console.log(`   - ${num.e164} (${num.label || 'Main'})`)
    })
  }

  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
