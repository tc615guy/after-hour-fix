import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { prisma } from '@/lib/db'

dotenvConfig({ path: '.env.local' })

function ago(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000)
}

async function main() {
  const minutes = Number(process.env.WINDOW_MINUTES || 120)
  const since = ago(minutes)

  console.log(`Inspecting events since: ${since.toISOString()}`)

  const [events, calls, bookings] = await Promise.all([
    prisma.eventLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.call.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  console.log('\nRecent Event Logs:')
  if (events.length === 0) console.log('  (none)')
  for (const e of events) {
    const payloadPreview = (() => {
      try {
        const keys = e.payload && typeof e.payload === 'object' ? Object.keys(e.payload as any) : []
        return keys.slice(0, 5).join(', ')
      } catch {
        return ''
      }
    })()
    console.log(`- [${e.createdAt.toISOString()}] ${e.type}${payloadPreview ? ` (${payloadPreview})` : ''}`)
  }

  console.log('\nRecent Calls:')
  if (calls.length === 0) console.log('  (none)')
  for (const c of calls) {
    console.log(`- ${c.createdAt.toISOString()} vapiCallId=${c.vapiCallId || 'n/a'} status=${c.status} duration=${c.durationSec ?? 0}s voiceConf=${c.voiceConfidence ?? 0} escalated=${c.escalated} reason=${c.escalationReason || ''}`)
  }

  console.log('\nRecent Bookings:')
  if (bookings.length === 0) console.log('  (none)')
  for (const b of bookings) {
    console.log(`- ${b.createdAt.toISOString()} ${b.customerName || ''} at ${b.slotStart?.toISOString() || 'n/a'} status=${b.status}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

