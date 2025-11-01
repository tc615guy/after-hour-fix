import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const active = Boolean(body.membershipActive)
    await prisma.project.update({ where: { id }, data: { membershipActive: active } })
    await prisma.eventLog.create({ data: { projectId: id, type: active ? 'membership.enabled' : 'membership.disabled', payload: {} } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update membership' }, { status: 500 })
  }
}

