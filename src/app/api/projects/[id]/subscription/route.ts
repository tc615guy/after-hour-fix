import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: true },
    })

    if (!project || !project.owner) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const sub = await prisma.subscription.findFirst({
      where: {
        userId: project.owner.id,
        status: { in: ['active', 'trialing'] },
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (!sub) {
      return NextResponse.json({ subscription: null })
    }

    return NextResponse.json({
      subscription: {
        id: sub.id,
        status: sub.status,
        priceId: sub.priceId,
        stripeCustomerId: sub.stripeCustomerId,
        stripeSubId: sub.stripeSubId,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
        updatedAt: sub.updatedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Get project subscription error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

