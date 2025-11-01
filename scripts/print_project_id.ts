import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const p = await prisma.project.findFirst()
  if (!p) { console.log('no project'); return }
  console.log(JSON.stringify({ id: p.id, name: p.name, tz: p.timezone }, null, 2))
}

main().finally(()=>prisma.())
