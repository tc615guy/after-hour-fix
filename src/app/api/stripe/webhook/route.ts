import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  // Use raw buffer for signature verification to avoid any encoding issues
  const arrayBuf = await req.arrayBuffer()
  const rawBody = Buffer.from(arrayBuf)
  const headersList = headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Check if this is a setup fee + subscription payment
        if (session.metadata?.type === 'setup_with_subscription' && session.metadata?.userId) {
          const userId = session.metadata.userId
          
          // Mark setup fee as paid
          await prisma.user.update({
            where: { id: userId },
            data: { setupFee: 'paid' },
          })
          
          console.log(`[Stripe Webhook] Setup fee paid for user ${userId}`)
          
          // Create subscription record
          if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

            await prisma.subscription.create({
              data: {
                userId,
                stripeCustomerId: session.customer as string,
                stripeSubId: subscription.id,
                priceId: subscription.items.data[0].price.id,
                status: subscription.status,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              },
            })

            // Ensure overage metered item exists on the subscription (optional)
            try {
              const overagePrice = process.env.STRIPE_PRICE_OVERAGE_MINUTE
              if (overagePrice) {
                const hasOverage = subscription.items.data.some((it) => it.price.id === overagePrice)
                if (!hasOverage) {
                  await stripe.subscriptionItems.create({
                    subscription: subscription.id,
                    price: overagePrice,
                  })
                }
              }
            } catch (e: any) {
              console.warn('[Stripe] add overage item skipped:', e?.message)
            }

            console.log(`[Stripe Webhook] Subscription created for user ${userId}`)
          }
          
          await prisma.eventLog.create({
            data: {
              type: 'setup_with_subscription.completed',
              payload: { userId, sessionId: session.id, subscriptionId: session.subscription },
            },
          })
          break
        }

        // Handle standalone subscription checkout (old flow)
        const userId = session.client_reference_id

        if (!userId || !session.subscription) {
          break
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

        await prisma.subscription.create({
          data: {
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubId: subscription.id,
            priceId: subscription.items.data[0].price.id,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        })

        // Ensure overage metered item exists on the subscription (optional)
        try {
          const overagePrice = process.env.STRIPE_PRICE_OVERAGE_MINUTE
          if (overagePrice) {
            const hasOverage = subscription.items.data.some((it) => it.price.id === overagePrice)
            if (!hasOverage) {
              await stripe.subscriptionItems.create({
                subscription: subscription.id,
                price: overagePrice,
              })
            }
          }
        } catch (e: any) {
          console.warn('[Stripe] add overage item skipped:', e?.message)
        }

        await prisma.eventLog.create({
          data: {
            type: 'subscription.created',
            payload: { userId, subscriptionId: subscription.id },
          },
        })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        await prisma.subscription.updateMany({
          where: { stripeSubId: subscription.id },
          data: {
            status: subscription.status,
            priceId: subscription.items.data[0].price.id,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        await prisma.subscription.updateMany({
          where: { stripeSubId: subscription.id },
          data: { status: 'canceled' },
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        await prisma.eventLog.create({
          data: {
            type: 'invoice.payment_succeeded',
            payload: { invoiceId: invoice.id, amount: invoice.amount_paid },
          },
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
