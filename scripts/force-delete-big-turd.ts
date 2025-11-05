import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  FORCE DELETING "Big Turd Plumbing" - HARD DELETE (PERMANENT)\n')
  console.log('='.repeat(80))
  
  // Find all projects with "Turd" in the name
  const turdProjects = await prisma.project.findMany({
    where: {
      name: {
        contains: 'Turd',
        mode: 'insensitive',
      },
    },
    include: {
      agents: true,
      numbers: true,
      calls: true,
      bookings: true,
      technicians: true,
    },
  })
  
  if (turdProjects.length === 0) {
    console.log('✅ No projects with "Turd" in name found. Nothing to delete.')
    await prisma.$disconnect()
    return
  }
  
  console.log(`\n📋 Found ${turdProjects.length} project(s) with "Turd" in name:\n`)
  
  for (const project of turdProjects) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`\n🗑️  DELETING PROJECT: ${project.name} (${project.id})`)
    console.log(`   Created: ${project.createdAt}`)
    console.log(`   Phone Numbers: ${project.numbers.length}`)
    console.log(`   Agents: ${project.agents.length}`)
    console.log(`   Calls: ${project.calls.length}`)
    console.log(`   Bookings: ${project.bookings.length}`)
    console.log(`   Technicians: ${project.technicians.length}`)
    
    // Hard delete all related records first (foreign key constraints)
    
    // Delete calls
    if (project.calls.length > 0) {
      const deletedCalls = await prisma.call.deleteMany({
        where: { projectId: project.id },
      })
      console.log(`   ✅ Deleted ${deletedCalls.count} call(s)`)
    }
    
    // Delete bookings
    if (project.bookings.length > 0) {
      const deletedBookings = await prisma.booking.deleteMany({
        where: { projectId: project.id },
      })
      console.log(`   ✅ Deleted ${deletedBookings.count} booking(s)`)
    }
    
    // Delete technicians
    if (project.technicians.length > 0) {
      const deletedTechs = await prisma.technician.deleteMany({
        where: { projectId: project.id },
      })
      console.log(`   ✅ Deleted ${deletedTechs.count} technician(s)`)
    }
    
    // Delete phone numbers
    if (project.numbers.length > 0) {
      const deletedNumbers = await prisma.phoneNumber.deleteMany({
        where: { projectId: project.id },
      })
      console.log(`   ✅ Deleted ${deletedNumbers.count} phone number(s)`)
    }
    
    // Delete agents
    if (project.agents.length > 0) {
      const deletedAgents = await prisma.agent.deleteMany({
        where: { projectId: project.id },
      })
      console.log(`   ✅ Deleted ${deletedAgents.count} agent(s)`)
    }
    
    // Delete event logs
    const deletedLogs = await prisma.eventLog.deleteMany({
      where: { projectId: project.id },
    })
    if (deletedLogs.count > 0) {
      console.log(`   ✅ Deleted ${deletedLogs.count} event log(s)`)
    }
    
    // Finally, delete the project itself
    await prisma.project.delete({
      where: { id: project.id },
    })
    
    console.log(`   ✅ PROJECT DELETED: ${project.name}`)
  }
  
  console.log(`\n${'='.repeat(80)}`)
  console.log(`\n✅ COMPLETE: Hard-deleted ${turdProjects.length} project(s) and all related records`)
  console.log(`\n⚠️  This was a HARD DELETE - records are permanently removed from the database.`)
  
  // Verify deletion
  const remaining = await prisma.project.findMany({
    where: {
      name: {
        contains: 'Turd',
        mode: 'insensitive',
      },
    },
  })
  
  if (remaining.length > 0) {
    console.log(`\n⚠️  WARNING: ${remaining.length} project(s) still found with "Turd" in name!`)
    remaining.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`)
    })
  } else {
    console.log(`\n✅ VERIFIED: No projects with "Turd" remain in database`)
  }
  
  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
