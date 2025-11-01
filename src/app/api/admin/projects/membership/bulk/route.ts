import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids : []
    const active = Boolean(body.membershipActive)
    if (!ids.length) return NextResponse.json({ error: 'No ids' }, { status: 400 })
    await prisma.project.updateMany({ where: { id: { in: ids } }, data: { membershipActive: active } })
    await prisma.eventLog.create({ data: { type: 'membership.bulk_update', payload: { ids, membershipActive: active } } })
    return NextResponse.json({ success: true, count: ids.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed bulk update' }, { status: 500 })
  }
}

