import { NextRequest, NextResponse } from 'next/server'
import { createCustomerPortalSession } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const { projectId } = z.object({ projectId: z.string().min(1) }).parse(await req.json())

    // Get user subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        user: {
          projects: {
            some: { id: projectId },
          },
        },
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const url = await createCustomerPortalSession(
      subscription.stripeCustomerId,
      `${appUrl}/dashboard`
    )

    return NextResponse.json({ url })
  } catch (error: any) {
    console.error('Stripe portal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
