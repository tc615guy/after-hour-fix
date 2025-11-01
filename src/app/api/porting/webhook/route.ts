import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, status, focDate } = body || {}
    if (!projectId || !status) return NextResponse.json({ error: 'Missing projectId or status' }, { status: 400 })
    await prisma.eventLog.create({ data: { projectId, type: 'porting.status', payload: { status, focDate: focDate || null } } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Webhook error' }, { status: 500 })
  }
}

