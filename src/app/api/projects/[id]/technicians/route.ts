import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { requireSession, ensureProjectAccess, rateLimit, captureException } from '@/lib/api-guard'
import { audit } from '@/lib/audit'

// GET all technicians for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `techs:GET:${projectId}:${ip}`, 120, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', projectId)

    const technicians = await prisma.technician.findMany({
      where: { projectId, deletedAt: null },
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({ technicians })
  } catch (error: any) {
    captureException(error)
    console.error('[Technicians] GET Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch technicians' },
      { status: 500 }
    )
  }
}

// POST create new technician
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `techs:POST:${projectId}:${ip}`, 30, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', projectId)

    const body = await req.json()
    const Schema = z.object({
      name: z.string().min(1),
      phone: z.string().min(7),
      email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
    })
    const { name, phone, email } = Schema.parse(body)

    const technician = await prisma.technician.create({
      data: {
        projectId,
        name,
        phone,
        email,
      },
    })

    await audit({ projectId, type: 'technician.create', payload: { id: technician.id, name, phone, email } })

    return NextResponse.json({ technician })
  } catch (error: any) {
    captureException(error)
    console.error('[Technicians] POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create technician' },
      { status: 500 }
    )
  }
}
