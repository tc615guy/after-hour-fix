import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { startOfDay } from 'date-fns'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId') || undefined
    const since = startOfDay(new Date())

    const eocs = await prisma.eventLog.findMany({
      where: {
        type: 'vapi.end_of_call',
        createdAt: { gte: since },
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 1000,
    })

    let upserts = 0
    for (const e of eocs) {
      const payload: any = e.payload || {}
      const vapiCallId = payload.callId
      if (!vapiCallId) continue

      // Map to project by existing eventLog projectId; fallback skip
      const pj = e.projectId
      if (!pj) continue

      await prisma.call.upsert({
        where: { vapiCallId },
        create: {
          vapiCallId,
          projectId: pj,
          direction: 'inbound',
          fromNumber: 'unknown',
          toNumber: 'unknown',
          status: 'completed',
        },
        update: { status: 'completed' },
      })
      upserts++
    }

    return NextResponse.json({ success: true, upserts })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Backfill failed' }, { status: 500 })
  }
}

