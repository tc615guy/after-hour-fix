import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createCheckoutSession, STARTER_PRICE_ID, PRO_PRICE_ID, PREMIUM_PRICE_ID } from '@/lib/stripe'
import { z } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const Schema = z.object({ projectId: z.string().min(1), plan: z.enum(['Starter', 'Pro', 'Premium']).optional() })
    const { projectId, plan } = Schema.parse(await req.json())

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: true },
    })

    if (!project || !project.owner) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const priceId = plan === 'Premium' ? PREMIUM_PRICE_ID : plan === 'Starter' ? STARTER_PRICE_ID : PRO_PRICE_ID

    const checkoutUrl = await createCheckoutSession(
      project.owner.id,
      project.owner.email,
      priceId,
      `${appUrl}/dashboard?welcome=true`,
      `${appUrl}/onboarding?canceled=1`
    )

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ checkoutUrl })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: error.message || 'Checkout error' }, { status: 500 })
  }
}
