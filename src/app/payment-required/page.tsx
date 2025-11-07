'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Check, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PaymentRequiredPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

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

  const handleCheckout = async () => {
    setLoading(true)
    try {
      // Create Stripe checkout session for setup fee
      const res = await fetch('/api/stripe/create-setup-checkout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await res.json()
      
      // Redirect to Stripe checkout
      window.location.href = data.url
    } catch (error: any) {
      alert(error.message || 'Failed to start checkout')
      setLoading(false)
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-3xl">One-Time Setup Fee</CardTitle>
          <CardDescription className="text-lg mt-2">
            Complete your AfterHourFix setup to start taking after-hours calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pricing */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-8 text-center">
            <div className="text-5xl font-bold mb-2">$299</div>
            <div className="text-blue-100">One-time setup fee</div>
            <div className="text-sm text-blue-200 mt-2">Then choose your monthly plan</div>
          </div>

          {/* What's Included */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">What's Included:</h3>
            <ul className="space-y-2">
              {[
                'AI receptionist configured for your business',
                'Cal.com calendar integration',
                'Custom pricing & service setup',
                'Business hours configuration',
                'Emergency routing setup',
                'SMS & email notifications',
                'Complete dashboard access',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <Button
            onClick={handleCheckout}
            disabled={loading}
            size="lg"
            className="w-full text-lg py-6"
          >
            {loading ? (
              'Redirecting to checkout...'
            ) : (
              <>
                Pay Setup Fee & Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 space-y-2">
            <p>Secure payment powered by Stripe</p>
            <p>
              Questions?{' '}
              <Link href="/contact" className="text-blue-600 hover:underline">
                Contact us
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

