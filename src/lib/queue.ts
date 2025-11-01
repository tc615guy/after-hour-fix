// Lightweight queue facade. Prefers BullMQ if enabled; otherwise tries Upstash Redis REST; otherwise logs.

type Job = { name: string; payload: any; enqueuedAt: string }

let bullQueue: any = null

async function getBullQueue(name: string) {
  if (!process.env.BULLMQ_ENABLED || process.env.BULLMQ_ENABLED === 'false') return null
  try {
    const { Queue } = await import('bullmq')
    const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } }
    bullQueue = bullQueue || new Queue(name, connection)
    return bullQueue
  } catch {
    return null
  }
}

async function pushUpstash(queue: string, job: Job) {
  const urlBase = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!urlBase || !token) return false
  try {
    const key = encodeURIComponent(`queue:${queue}`)
    const body = encodeURIComponent(JSON.stringify(job))
    // LPUSH queue value
    await fetch(`${urlBase}/LPUSH/${key}/${body}`, { headers: { Authorization: `Bearer ${token}` } })
    // Optional: set TTL to 7 days if not exists
    await fetch(`${urlBase}/EXPIRE/${key}/604800`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    return true
  } catch {
    return false
  }
}

export async function enqueue(queue: string, name: string, payload: any) {
  const job: Job = { name, payload, enqueuedAt: new Date().toISOString() }
  // Try BullMQ first if enabled
  const q = await getBullQueue(queue)
  if (q) {
    try {
      await q.add(name, payload)
      return
    } catch {
      // fall through
    }
  }
  // Upstash REST fallback
  const ok = await pushUpstash(queue, job)
  if (ok) return
  // Dev fallback: log only
  console.log(`[queue:${queue}]`, job)
}
