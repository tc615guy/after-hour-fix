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
    await rateLimit(req, `project:GET:${id}:${ip}`, 60, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', id)

    const project = await prisma.project.findUnique({
      where: { id, deletedAt: null },
      include: {
        agents: true,
        numbers: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Derive plan from owner's active subscription (fallback: starter)
    let plan: 'starter' | 'pro' = 'starter'
    try {
      const subs = await prisma.subscription.findMany({
        where: { userId: project.ownerId, status: 'active' },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      })
      const active = subs[0]
      const proPrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PRO
      if (active && proPrice && active.priceId === proPrice) plan = 'pro'
    } catch (e) {
      // ignore and default to starter
    }

    return NextResponse.json({ project: { ...project, plan } })
  } catch (error: any) {
    captureException(error)
    console.error('Get project error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
