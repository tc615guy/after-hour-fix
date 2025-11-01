import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSession, captureException } from '@/lib/api-guard'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await requireSession(req)
    const job = await prisma.importJob.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Ensure the requester owns the job's project
    const project = await prisma.project.findUnique({ where: { id: job.projectId }, select: { ownerId: true } })
    if (!project || project.ownerId !== session!.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      id: job.id,
      projectId: job.projectId,
      type: job.type,
      status: job.status,
      total: job.total,
      processed: job.processed,
      error: job.error,
      result: job.result,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    })
  } catch (error: any) {
    captureException(error)
    return NextResponse.json({ error: error.message || 'Failed to fetch job' }, { status: 500 })
  }
}

