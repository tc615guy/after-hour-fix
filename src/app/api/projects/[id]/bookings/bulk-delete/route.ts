import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSession, ensureProjectAccess, rateLimit, captureException } from '@/lib/api-guard'
import { audit } from '@/lib/audit'

/**
 * POST /api/projects/[id]/bookings/bulk-delete
 * Hard-delete all bookings for a project (for re-import purposes)
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

    // First, count how many bookings exist (including soft-deleted ones)
    const countBefore = await prisma.booking.count({
      where: {
        projectId,
      },
    })

    console.log(`[BulkDelete] Found ${countBefore} total bookings for project ${projectId}`)

    // Hard delete ALL bookings for this project (including soft-deleted ones) to prevent duplicates
    const result = await prisma.booking.deleteMany({
      where: {
        projectId,
        // No deletedAt filter - delete everything, including soft-deleted bookings
      },
    })

    console.log(`[BulkDelete] Deleted ${result.count} bookings`)

    await audit({ 
      projectId, 
      type: 'bookings.bulkDelete', 
      payload: { count: result.count } 
    })

    return NextResponse.json({ 
      success: true, 
      deleted: result.count,
      message: `Deleted ${result.count} booking(s). You can now re-import with proper mappings.`,
    })
  } catch (error: any) {
    captureException(error)
    console.error('Bulk delete bookings error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

