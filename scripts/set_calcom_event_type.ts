#!/usr/bin/env tsx
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [projectId, eventTypeIdStr] = process.argv.slice(2)
  if (!projectId || !eventTypeIdStr) {
    console.error('Usage: tsx scripts/set_calcom_event_type.ts <projectId> <eventTypeId>')
    process.exit(1)
  }
  const eventTypeId = Number(eventTypeIdStr)
  if (!Number.isFinite(eventTypeId)) {
    console.error('Invalid eventTypeId')
    process.exit(1)
  }
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { calcomEventTypeId: eventTypeId },
    select: { id: true, name: true, calcomEventTypeId: true }
  })
  console.log('Updated project:', updated)
}

main().catch((e)=>{ console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())

