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
  const project = await prisma.project.findFirst({
    where: {
      name: {
        contains: 'Big Al',
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!project) {
    console.log('No project found')
    return
  }

  const allBookings = await prisma.booking.findMany({
    where: {
      projectId: project.id,
      deletedAt: null,
    },
    include: {
      technician: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      slotStart: 'asc',
    },
    take: 50,
  })

  console.log(`\n📋 All bookings for ${project.name}: ${allBookings.length}\n`)
  
  allBookings.forEach((b, i) => {
    const start = b.slotStart ? new Date(b.slotStart).toLocaleString('en-US', { timeZone: 'America/Chicago' }) : 'NO DATE'
    console.log(`${i + 1}. ${b.customerName || 'NO NAME'}`)
    console.log(`   Date: ${start}`)
    console.log(`   Tech: ${b.technician?.name || 'NONE'}`)
    console.log(`   TechID: ${b.technicianId || 'NULL'}`)
    console.log(`   Status: ${b.status}`)
    console.log('')
  })

  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
