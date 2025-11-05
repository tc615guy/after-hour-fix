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
        numbers: {
          where: { deletedAt: null },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Derive plan from owner's active subscription (fallback: starter)
    let plan: 'starter' | 'pro' | 'premium' = 'starter'
    try {
      const subs = await prisma.subscription.findMany({
        where: { userId: project.ownerId, status: 'active' },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      })
      const active = subs[0]
      const proPrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PRO
      const premiumPrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_PREMIUM
      if (active && premiumPrice && active.priceId === premiumPrice) plan = 'premium'
      else if (active && proPrice && active.priceId === proPrice) plan = 'pro'
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', id)

    const body = await req.json()
    const updateData: any = {}

    if (typeof body.businessAddress === 'string') {
      updateData.businessAddress = body.businessAddress
    }
    
    if (body.serviceRadius !== undefined) {
      updateData.serviceRadius = body.serviceRadius === null ? null : parseInt(body.serviceRadius)
    }
    
    if (body.warrantyInfo !== undefined) {
      updateData.warrantyInfo = body.warrantyInfo
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, project })
  } catch (error: any) {
    captureException(error)
    console.error('Update project error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
