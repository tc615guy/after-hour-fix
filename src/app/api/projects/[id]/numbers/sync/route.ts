import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import axios from 'axios'
import { enqueue } from '@/lib/queue'
import { requireSession, ensureProjectAccess, rateLimit, captureException } from '@/lib/api-guard'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `numbers:sync:${id}:${ip}`, 10, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', id)

    const project = await prisma.project.findUnique({
      where: { id },
      include: { agents: true },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!project.agents || project.agents.length === 0)
      return NextResponse.json({ error: 'No assistants found for project' }, { status: 400 })

    const apiKey = process.env.VAPI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'VAPI_API_KEY not configured' }, { status: 500 })

    const assistantIds = new Set(project.agents.map((a) => a.vapiAssistantId).filter(Boolean))
    const http = axios.create({
      baseURL: 'https://api.vapi.ai',
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    // List all phone numbers in Vapi account
    const url = new URL(req.url)
    if (url.searchParams.get('async') === '1') {
      const job = await prisma.importJob.create({
        data: { projectId: project.id, type: 'numbers.sync', status: 'queued' },
      })
      await enqueue('numbers', 'numbers.sync', { jobId: job.id, projectId: project.id })
      return NextResponse.json({ queued: true, jobId: job.id }, { status: 202 })
    }

    const resp = await http.get('/phone-number')
    const numbers: Array<{ id: string; number: string; assistantId?: string | null }> = resp.data

    let upserts = 0
    const linked: string[] = []

    for (const num of numbers) {
      if (!num.assistantId || !assistantIds.has(num.assistantId)) continue
      // Check if number was soft-deleted and should be skipped
      const existingNumber = await prisma.phoneNumber.findUnique({
        where: { e164: num.number },
      })
      if (existingNumber?.deletedAt) {
        // Skip numbers that were intentionally soft-deleted
        continue
      }
      await prisma.phoneNumber.upsert({
        where: { e164: num.number },
        update: {
          projectId: project.id,
          vapiNumberId: num.id,
          label: 'Main',
          deletedAt: null, // Un-delete if it was soft-deleted
        },
        create: {
          projectId: project.id,
          e164: num.number,
          vapiNumberId: num.id,
          label: 'Main',
        },
      })
      upserts++
      linked.push(num.number)
    }

    return NextResponse.json({ success: true, projectId: project.id, upserts, linked })
  } catch (error: any) {
    captureException(error)
    console.error('Sync numbers error:', error.response?.data || error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
