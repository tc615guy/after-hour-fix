import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { startOfDay } from 'date-fns'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId') || undefined
    const since = startOfDay(new Date())

    const logs = await prisma.eventLog.findMany({
      where: {
        type: 'vapi.status_update',
        createdAt: { gte: since },
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 500,
    })

    let upserts = 0
    for (const log of logs) {
      const pl: any = log.payload || {}
      const vapiCallId = pl.callId || pl.id || pl.vapiCallId
      if (!vapiCallId) continue
      await prisma.call.upsert({
        where: { vapiCallId },
        create: {
          vapiCallId,
          projectId: log.projectId || 'unknown',
          direction: 'inbound',
          fromNumber: 'unknown',
          toNumber: 'unknown',
          status: pl.status || 'completed',
        },
        update: {
          status: pl.status || 'completed',
        },
      })
      upserts++
    }

    return NextResponse.json({ success: true, upserts })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Backfill failed' }, { status: 500 })
  }
}

