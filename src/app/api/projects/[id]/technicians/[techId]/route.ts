import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { requireSession, ensureProjectAccess, rateLimit, captureException } from '@/lib/api-guard'
import { audit } from '@/lib/audit'

// PUT update technician
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; techId: string } }
) {
  try {
    const { id: projectId, techId } = params
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `tech:PUT:${projectId}:${ip}`, 60, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', projectId)

    const body = await req.json()
    const Schema = z.object({
      name: z.string().min(1).optional(),
      phone: z.string().min(7).optional(),
      email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
      address: z
        .string()
        .min(3)
        .optional()
        .or(z.literal('').transform(() => undefined)),
      isActive: z.boolean().optional(),
      isOnCall: z.boolean().optional(),
      emergencyOnly: z.boolean().optional(),
      priority: z.number().int().min(0).max(100).optional(),
      onCallSchedule: z.any().optional(),
    })
    const data = Schema.parse(body)

    const technician = await prisma.technician.update({ where: { id: techId }, data })
    await audit({ projectId, type: 'technician.update', payload: { id: techId, data } })

    return NextResponse.json({ technician })
  } catch (error: any) {
    captureException(error)
    console.error('[Technician] PUT Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update technician' },
      { status: 500 }
    )
  }
}

// DELETE technician
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; techId: string } }
) {
  try {
    const { id: projectId, techId } = params
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `tech:DEL:${projectId}:${ip}`, 30, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', projectId)

    await prisma.technician.update({ where: { id: techId }, data: { deletedAt: new Date() } })
    await audit({ projectId, type: 'technician.delete', payload: { id: techId } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    captureException(error)
    console.error('[Technician] DELETE Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete technician' },
      { status: 500 }
    )
  }
}
