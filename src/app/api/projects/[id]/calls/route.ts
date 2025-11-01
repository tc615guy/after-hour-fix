import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSession, ensureProjectAccess, rateLimit, captureException } from '@/lib/api-guard'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `calls:GET:${id}:${ip}`, 60, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', id)

    const url = new URL(req.url)
    const rawLimit = url.searchParams.get('limit')
    const rawCursor = url.searchParams.get('cursor')
    const limit = Math.min(Math.max(Number(rawLimit || 50), 1), 100)
    const cursor = rawCursor && rawCursor.length > 0 ? rawCursor : undefined

    const calls = await prisma.call.findMany({
      where: { projectId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        agent: { select: { name: true } },
      },
    })

    const nextCursor = calls.length === limit ? calls[calls.length - 1]?.id : undefined
    return NextResponse.json({ calls, nextCursor })
  } catch (error: any) {
    captureException(error)
    console.error('Get calls error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
