import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSession, ensureProjectAccess, rateLimit, captureException } from '@/lib/api-guard'
import { audit } from '@/lib/audit'

/**
 * POST /api/projects/[id]/bookings/bulk-delete
 * Soft-delete all bookings for a project (for re-import purposes)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `bookings:bulkDelete:${projectId}:${ip}`, 5, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', projectId)

    // Soft delete all non-deleted bookings for this project
    const result = await prisma.booking.updateMany({
      where: {
        projectId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    })

    await audit({ 
      projectId, 
      type: 'bookings.bulkDelete', 
      payload: { count: result.count } 
    })

    return NextResponse.json({ 
      success: true, 
      deleted: result.count,
      message: `Soft-deleted ${result.count} booking(s). You can now re-import with proper mappings.`,
    })
  } catch (error: any) {
    captureException(error)
    console.error('Bulk delete bookings error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

