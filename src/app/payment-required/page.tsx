'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Check, ArrowRight, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    price: 699,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    minutes: 800,
    popular: true,
    features: [
      '800 AI minutes/month',
      'Up to 3 phone numbers included',
      'OpenAI Realtime AI assistant',
      'Auto-syncs business data',
      'Cal.com integration',
      'Email & SMS confirmations',
      'Call transcripts',
      'Smart reports & tracking',
      'Priority support',
      'Custom conversation scripts',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For high-volume operations',
    price: 999,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ULTRA,
    minutes: 1200,
    features: [
      '1,200 AI minutes/month',
      'Unlimited phone numbers included',
      'OpenAI Realtime AI assistant',
      'Auto-syncs business data',
      'Cal.com integration',
      'Email & SMS confirmations',
      'Call transcripts',
      'Smart reports & tracking',
      'Priority support',
      'Custom conversation scripts',
      'Dedicated account manager',
    ],
  },
]

export default function PaymentRequiredPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('pro')

  useEffect(() => {
    // Check if user has already paid
    checkPaymentStatus()
  }, [])

  const checkPaymentStatus = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.user?.setupFee === 'paid') {
          // User has already paid, redirect to dashboard
          router.push('/dashboard')
          return
        }
      }
    } catch (error) {
      console.error('Failed to check payment status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleCheckout = async (planId: string, priceId: string) => {
    setLoading(planId)
    try {
      // Create Stripe checkout session for setup fee + subscription
      const res = await fetch('/api/stripe/create-setup-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await res.json()
      
      // Redirect to Stripe checkout
      window.location.href = data.url
    } catch (error: any) {
      alert(error.message || 'Failed to start checkout')
      setLoading(null)
    }
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold mb-3">Complete Your Setup</h1>
          <p className="text-xl text-gray-600 mb-6">
            $299 one-time setup fee (non-refundable) + choose your monthly plan
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular ? 'border-blue-500 border-2 shadow-xl' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-4 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <div className="text-4xl font-bold">${plan.price}</div>
                  <div className="text-gray-500">/month</div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleCheckout(plan.id, plan.priceId!)}
                  disabled={loading !== null}
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {loading === plan.id ? (
                    'Processing...'
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Setup Fee Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h3 className="font-semibold text-lg mb-2">What's Included in Setup ($299)</h3>
          <div className="grid md:grid-cols-4 gap-4 text-sm text-gray-700">
            <div>✓ AI receptionist configured</div>
            <div>✓ Cal.com integration</div>
            <div>✓ Custom pricing setup</div>
            <div>✓ Business hours config</div>
            <div>✓ Emergency routing</div>
            <div>✓ SMS & email notifications</div>
            <div>✓ Complete dashboard access</div>
            <div>✓ Dedicated onboarding</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8 space-y-2">
          <p>Secure payment powered by Stripe • Setup fees are non-refundable • Overage minutes billed at $0.749/min</p>
          <p>
            Questions?{' '}
            <Link href="/contact" className="text-blue-600 hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

