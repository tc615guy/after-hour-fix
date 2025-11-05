import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/reassign-phone-number.ts <phoneNumber> <targetProjectName>')
    console.log('Example: npx tsx scripts/reassign-phone-number.ts +12057518083 "Big Al\'s Plumbing"')
    process.exit(1)
  }

  const phoneNumberE164 = args[0]
  const targetProjectName = args[1]

  console.log(`🔧 Reassigning ${phoneNumberE164} to "${targetProjectName}"\n`)

  // Find the phone number
  const phoneNumber = await prisma.phoneNumber.findFirst({
    where: { e164: phoneNumberE164 },
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
    console.error(`❌ Phone number ${phoneNumberE164} not found`)
    process.exit(1)
  }

  console.log(`📞 Current assignment:`)
  console.log(`   Phone: ${phoneNumber.e164}`)
  console.log(`   Project: ${phoneNumber.project.name} (${phoneNumber.project.id})`)
  console.log(`   Status: ${phoneNumber.project.deletedAt ? '❌ DELETED' : '✅ ACTIVE'}\n`)

  // Find the target project
  const targetProject = await prisma.project.findFirst({
    where: {
      name: {
        contains: targetProjectName,
        mode: 'insensitive',
      },
      deletedAt: null,
    },
    include: {
      agents: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!targetProject) {
    console.error(`❌ Target project "${targetProjectName}" not found or is deleted`)
    process.exit(1)
  }

  if (targetProject.agents.length === 0) {
    console.error(`❌ Target project "${targetProjectName}" has no active agents`)
    process.exit(1)
  }

  console.log(`🎯 Target project:`)
  console.log(`   Name: ${targetProject.name}`)
  console.log(`   ID: ${targetProject.id}`)
  console.log(`   Agent: ${targetProject.agents[0].name} (${targetProject.agents[0].id})\n`)

  // Confirm reassignment
  if (phoneNumber.projectId === targetProject.id) {
    console.log(`✅ Phone number is already assigned to this project. No changes needed.`)
    await prisma.$disconnect()
    return
  }

  console.log(`⚠️  Reassigning phone number to new project...`)

  // Update the phone number
  const updated = await prisma.phoneNumber.update({
    where: { id: phoneNumber.id },
    data: {
      projectId: targetProject.id,
    },
  })

  console.log(`✅ Phone number reassigned successfully!`)
  console.log(`   From: ${phoneNumber.project.name} (${phoneNumber.project.id})`)
  console.log(`   To: ${targetProject.name} (${targetProject.id})`)

  // Log the event
  await prisma.eventLog.create({
    data: {
      projectId: targetProject.id,
      type: 'number.reassigned',
      payload: {
        phoneNumber: phoneNumberE164,
        fromProject: phoneNumber.project.name,
        toProject: targetProject.name,
      },
    },
  })

  console.log(`📝 Event logged`)

  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
