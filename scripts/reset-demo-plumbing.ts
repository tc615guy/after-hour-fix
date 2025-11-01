#!/usr/bin/env tsx
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { createCalComClient } from '../src/lib/calcom'

const prisma = new PrismaClient()

async function main() {
  const ownerEmail = 'demo@example.com'
  const apiKey = process.env.CALCOM_API_KEY || ''
  const basePlumbingId = process.env.CALCOM_EVENT_TYPE_ID_PLUMBING ? Number(process.env.CALCOM_EVENT_TYPE_ID_PLUMBING) : undefined

  console.log('🔧 Resetting Demo Plumbing project...')

  // Ensure demo owner exists
  let owner = await prisma.user.findUnique({ where: { email: ownerEmail } })
  if (!owner) {
    owner = await prisma.user.create({ data: { email: ownerEmail, name: 'Demo User' } })
    console.log('   ✓ Created demo owner user')
  }

  // Delete old demo plumbing project if present
  const old = await prisma.project.findFirst({ where: { id: 'demo-project' } })
  if (old) {
    await prisma.project.delete({ where: { id: old.id } })
    console.log('   ✓ Deleted existing demo-project')
  }

  const old2 = await prisma.project.findFirst({ where: { id: 'demo-plumbing' } })
  if (old2) {
    await prisma.project.delete({ where: { id: old2.id } })
    console.log('   ✓ Deleted existing demo-plumbing')
  }

  console.log('   → Creating new Demo Plumbing project...')
  let project = await prisma.project.create({
    data: {
      id: 'demo-plumbing',
      ownerId: owner.id,
      name: 'Demo Plumbing',
      trade: 'plumbing',
      timezone: 'America/Chicago',
      ownerPhone: '+15555555555',
    },
  })
  console.log('   ✓ Project created:', project.id)

  // Try cloning Cal.com event type if configured
  if (apiKey && basePlumbingId) {
    try {
      const cal = createCalComClient(apiKey)
      const evt = await cal.createEventTypeFromBase({ baseEventTypeId: basePlumbingId, projectName: project.name, trade: 'plumbing' })
      project = await prisma.project.update({ where: { id: project.id }, data: { calcomApiKey: apiKey, calcomEventTypeId: evt.id, calcomConnectedAt: new Date() } })
      console.log('   ✓ Cloned Cal.com event type ->', evt.id)
    } catch (e: any) {
      console.warn('   ! Skipped Cal.com clone:', e?.response?.data || e?.message)
    }
  } else {
    console.log('   (Skipping Cal.com clone; missing CALCOM_API_KEY or CALCOM_EVENT_TYPE_ID_PLUMBING)')
  }

  console.log('\n✅ Demo Plumbing reset complete.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())

