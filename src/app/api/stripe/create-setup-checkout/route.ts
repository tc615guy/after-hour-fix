import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { priceId } = body

    if (!priceId) {
      return NextResponse.json({ error: 'Plan price ID is required' }, { status: 400 })
    }

    // Get user from session
    const res = await fetch(`${req.nextUrl.origin}/api/auth/me`, {
      headers: {
        cookie: req.headers.get('cookie') || '',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = await res.json()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already paid
    if (user.setupFee === 'paid') {
      return NextResponse.json({ error: 'Setup fee already paid' }, { status: 400 })
    }

    // Create Stripe checkout session for $299 setup fee + monthly subscription
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      client_reference_id: user.id, // For subscription linkage
      line_items: [
        // One-time setup fee
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'AfterHourFix Setup Fee',
              description: 'One-time setup: AI configuration, calendar integration, and complete platform access',
            },
            unit_amount: 29900, // $299.00 in cents
          },
          quantity: 1,
        },
        // Monthly subscription
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.nextUrl.origin}/dashboard?payment=success`,
      cancel_url: `${req.nextUrl.origin}/payment-required?canceled=true`,
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
      metadata: {
        userId: user.id,
        type: 'setup_with_subscription',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('[Setup Checkout] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

