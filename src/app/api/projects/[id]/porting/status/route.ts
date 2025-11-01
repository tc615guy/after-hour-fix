import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const last = await prisma.eventLog.findFirst({
      where: { projectId, type: { in: ['porting.status', 'porting.request'] } },
      orderBy: { createdAt: 'desc' },
    })
    if (!last) return NextResponse.json({})
    const p: any = last.payload || {}
    return NextResponse.json({ status: p.status || (last.type === 'porting.request' ? 'submitted' : 'unknown'), focDate: p.focDate || null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load status' }, { status: 500 })
  }
}

