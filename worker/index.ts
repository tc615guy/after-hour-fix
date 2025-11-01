/*
  BullMQ worker for background jobs.
  - Requires env: BULLMQ_ENABLED=true, REDIS_URL=redis://...
*/

async function main() {
  if (!process.env.BULLMQ_ENABLED || process.env.BULLMQ_ENABLED === 'false') {
    console.log('[worker] BULLMQ_ENABLED is false; exiting')
    return
  }
  let Worker: any
  try {
    Worker = (await import('bullmq')).Worker
  } catch (e) {
    console.error('[worker] bullmq not installed; exiting')
    return
  }

  const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } }

  const emailWorker = new Worker(
    'emails',
    async (job: any) => {
      if (job.name === 'email.send') {
        const { sendEmail } = await import('../src/lib/email')
        const ok = await sendEmail(job.data)
        if (!ok) throw new Error('sendEmail failed')
      }
    },
    connection
  )

  emailWorker.on('completed', (job: any) => console.log(`[worker] completed`, job.name, job.id))
  emailWorker.on('failed', (job: any, err: any) => console.error(`[worker] failed`, job?.name, job?.id, err?.message))

  const bookingsWorker = new Worker(
    'bookings',
    async (job: any) => {
      const { prisma } = await import('../src/lib/db')
      const jobId: string | undefined = job.data?.jobId
      async function updateStatus(patch: any) {
        if (!jobId) return
        try { await prisma.importJob.update({ where: { id: jobId }, data: patch }) } catch {}
      }
      if (job.name === 'bookings.import') {
        const { projectId, bookings } = job.data as { jobId?: string; projectId: string; bookings: any[] }
        await updateStatus({ status: 'processing', processed: 0 })
        const toCreate: any[] = []
        let processed = 0
        for (const b of bookings || []) {
          const slotStart = b.slotStart ? new Date(b.slotStart) : null
          const slotEnd = (b as any).slotEnd ? new Date((b as any).slotEnd) : null
          if (!slotStart || isNaN(slotStart.getTime())) continue
          const aptId = (b as any).appointmentId ? String((b as any).appointmentId).trim() : ''
          if (aptId) {
            const tag = `[APTID:${aptId}]`
            const exists = await prisma.booking.findFirst({ where: { projectId, notes: { contains: tag } } })
            if (exists) continue
          }
          const phoneDigits = (b.customerPhone || '').replace(/\D/g, '')
          const existing = await prisma.booking.findFirst({
            where: {
              projectId,
              slotStart,
              OR: [phoneDigits ? { customerPhone: { contains: phoneDigits } } : { customerName: { equals: b.customerName || '' } }],
            },
          })
          if (existing) continue
          const status = (b.status || '').toLowerCase() === 'scheduled' ? 'booked' : (b.status || 'booked')
          const parts: string[] = []
          parts.push('[IMPORTED]')
          if (aptId) parts.push(`[APTID:${aptId}]`)
          const combinedNotes = b.notes ? `${parts.join(' ')} ${b.notes}` : parts.join(' ')
          toCreate.push({
            projectId,
            customerName: b.customerName,
            customerPhone: b.customerPhone || null,
            customerEmail: b.customerEmail || null,
            slotStart,
            slotEnd: slotEnd && !isNaN(slotEnd.getTime()) ? slotEnd : null,
            status,
            priceCents: b.priceCents || null,
            notes: combinedNotes,
          })
          processed++
          if (processed % 25 === 0) await updateStatus({ processed })
        }
        if (toCreate.length > 0) await prisma.booking.createMany({ data: toCreate })
        await updateStatus({ status: 'completed', processed: processed, result: { created: toCreate.length } })
        return
      }
      if (job.name === 'bookings.importBatch') {
        const { projectId, rows } = job.data as { jobId?: string; projectId: string; rows: any[] }
        await updateStatus({ status: 'processing', processed: 0 })
        let created = 0
        let processed = 0
        for (const r of rows || []) {
          try {
            const slotStart = r.slotStart ? new Date(r.slotStart) : null
            const slotEnd = r.slotEnd ? new Date(r.slotEnd) : null
            if (!slotStart || isNaN(slotStart.getTime())) continue
            const aptId = (r.appointmentId || '').toString().trim()
            if (aptId) {
              const tag = `[APTID:${aptId}]`
              const existingByApt = await prisma.booking.findFirst({ where: { projectId, notes: { contains: tag } } })
              if (existingByApt) continue
            }
            const phoneDigits = (r.customerPhone || '').replace(/\D/g, '')
            const existing = await prisma.booking.findFirst({
              where: {
                projectId,
                slotStart,
                OR: [phoneDigits ? { customerPhone: { contains: phoneDigits } } : { customerName: { equals: r.customerName || '' } }],
              },
            })
            if (existing) continue
            const parts: string[] = []
            parts.push('[IMPORTED]')
            if (aptId) parts.push(`[APTID:${aptId}]`)
            if (r.jobNumber) parts.push(`[JOB:${r.jobNumber}]`)
            if (r.campaignSource) parts.push(`[SRC:${r.campaignSource}]`)
            if (r.notes) parts.push(String(r.notes))
            const combinedNotes = parts.join(' ')
            const status = (r.status || '').toLowerCase() === 'scheduled' ? 'booked' : (r.status || 'booked')
            const address = r.address || [r.street, r.city, r.state, r.zip].filter(Boolean).join(', ').trim() || null
            await prisma.booking.create({
              data: {
                projectId,
                customerName: r.customerName || 'Unknown',
                customerPhone: r.customerPhone || null,
                customerEmail: r.customerEmail || null,
                address,
                notes: combinedNotes,
                slotStart,
                slotEnd: slotEnd && !isNaN(slotEnd.getTime()) ? slotEnd : null,
                status,
                priceCents: typeof r.priceCents === 'number' ? r.priceCents : null,
              },
            })
            created++
            processed++
            if (processed % 25 === 0) await updateStatus({ processed })
          } catch {
            // continue next row
          }
        }
        await updateStatus({ status: 'completed', processed, result: { created } })
        return
      }
    },
    connection
  )

  bookingsWorker.on('completed', (job: any) => console.log(`[worker] completed`, job.name, job.id))
  bookingsWorker.on('failed', (job: any, err: any) => console.error(`[worker] failed`, job?.name, job?.id, err?.message))

  const numbersWorker = new Worker(
    'numbers',
    async (job: any) => {
      if (job.name !== 'numbers.sync') return
      const { prisma } = await import('../src/lib/db')
      const axios = (await import('axios')).default
      const { projectId, jobId } = job.data as { projectId: string; jobId?: string }
      async function updateStatus(patch: any) {
        if (!jobId) return
        try { await prisma.importJob.update({ where: { id: jobId }, data: patch }) } catch {}
      }
      await updateStatus({ status: 'processing', processed: 0 })
      const project = await prisma.project.findUnique({ where: { id: projectId }, include: { agents: true } })
      if (!project) return
      const apiKey = process.env.VAPI_API_KEY
      if (!apiKey) throw new Error('VAPI_API_KEY not configured')
      const assistantIds = new Set(project.agents.map((a: any) => a.vapiAssistantId).filter(Boolean))
      const http = axios.create({ baseURL: 'https://api.vapi.ai', headers: { Authorization: `Bearer ${apiKey}` } })
      const resp = await http.get('/phone-number')
      const numbers: Array<{ id: string; number: string; assistantId?: string | null }> = resp.data
      let processed = 0
      for (const num of numbers) {
        if (!num.assistantId || !assistantIds.has(num.assistantId)) continue
        await prisma.phoneNumber.upsert({
          where: { e164: num.number },
          update: { projectId: project.id, vapiNumberId: num.id, label: 'Main' },
          create: { projectId: project.id, e164: num.number, vapiNumberId: num.id, label: 'Main' },
        })
        processed++
        if (processed % 25 === 0) await updateStatus({ processed })
      }
      await updateStatus({ status: 'completed', processed })
    },
    connection
  )

  numbersWorker.on('completed', (job: any) => console.log(`[worker] completed`, job.name, job.id))
  numbersWorker.on('failed', (job: any, err: any) => console.error(`[worker] failed`, job?.name, job?.id, err?.message))

  console.log('[worker] listening on queues: emails, bookings, numbers')
}

main().catch((e) => {
  console.error('[worker] fatal error', e)
  process.exit(1)
})
