import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing: AI Receptionist for Trades | Affordable 24/7 Call Answering',
  description: 'Simple, transparent pricing for AI receptionist services. Plans from $199/month for plumbers, HVAC contractors, and electricians. Includes 24/7 call answering, automatic booking, and calendar integration.',
  keywords: [
    'AI receptionist pricing',
    'answering service cost',
    '24/7 call answering price',
    'automated booking system pricing',
    'voice AI receptionist cost',
    'plumber answering service price',
    'HVAC contractor AI pricing',
    'electrician call answering cost',
    'affordable AI receptionist',
    'trade business answering service pricing',
    'missed call prevention cost',
    'automatic job booking pricing',
  ],
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Pricing: AI Receptionist for Trade Professionals',
    description: 'Simple, transparent pricing starting at $199/month. No hidden fees.',
    type: 'website',
    url: '/pricing',
  },
}

export default function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: 199,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
      description: 'Perfect for solo operators',
      features: [
        '300 AI minutes/month',
        '1 phone number',
        'OpenAI Realtime AI assistant',
        'Auto-syncs business data (pricing, hours, technicians)',
        'Cal.com integration',
        'Email & SMS confirmations',
        'Call transcripts',
        'Smart reports & tracking',
        '7-day pro-rated refund',
      ],
    },
    {
      name: 'Pro',
      price: 399,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
      description: 'For growing businesses',
      features: [
        '800 AI minutes/month',
        '3 phone numbers',
        'OpenAI Realtime AI assistant',
        'Auto-syncs business data (pricing, hours, technicians)',
        'Cal.com integration',
        'Email & SMS confirmations',
        'Call transcripts',
        'Smart reports & tracking',
        'Priority support',
        'Custom conversation scripts',
        '7-day pro-rated refund',
      ],
      popular: true,
    },
    {
      name: 'Premium',
      price: 599,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ULTRA,
      description: 'For high-volume operations',
      features: [
        '1,200 AI minutes/month',
        'Unlimited phone numbers',
        'OpenAI Realtime AI assistant',
        'Auto-syncs business data (pricing, hours, technicians)',
        'Cal.com integration',
        'Email & SMS confirmations',
        'Call transcripts',
        'Smart reports & tracking',
        'Priority support',
        'Custom conversation scripts',
        'Dedicated account manager',
        '7-day pro-rated refund',
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">AfterHourFix</Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm hover:text-blue-600 transition">Home</Link>
            <Link href="/features" className="text-sm hover:text-blue-600 transition">Features</Link>
            <Link href="/faq" className="text-sm hover:text-blue-600 transition">FAQ</Link>
            <Link href="/contact" className="text-sm hover:text-blue-600 transition">Contact</Link>
          </nav>
          <div className="flex gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">Choose the plan that fits your business</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.popular ? 'border-blue-600 border-2 relative' : ''}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/auth/signup" className="w-full">
                  <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                    Get Started
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* One-Time Setup Fee */}
        <div className="mt-16 mb-8">
          <Card className="max-w-3xl mx-auto border-2 border-blue-200 bg-blue-50/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl mb-2">One-Time Setup Fee: $299</CardTitle>
              <CardDescription className="text-base">
                Professional setup by our team to ensure your OpenAI Realtime AI assistant is configured perfectly and automatically receives all your business data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 mb-3">What's Included:</h4>
                  <div className="space-y-2">
                    {[
                      'OpenAI Realtime AI assistant configuration & optimization',
                      'Business hours & scheduling setup (automatically synced to assistant)',
                      'Cal.com calendar integration (real-time availability)',
                      'Pricing sheet upload & configuration (automatically loaded)',
                      'On-call technician routing setup (proximity-based)',
                      'Phone number setup & testing',
                      'Real-time data synchronization - assistant always has latest info'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 mb-3">Additional Value:</h4>
                  <div className="space-y-2">
                    {[
                      'Custom conversation scripts & templates',
                      'Knowledge base setup (FAQs & services)',
                      'Smart emergency routing configuration',
                      'SMS & email template customization',
                      'Dedicated onboarding specialist',
                      '1-hour training session & documentation'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
                <p className="text-sm text-center text-gray-700">
                  <strong className="text-blue-600">Setup typically takes 2-3 business days</strong> after payment. 
                  You'll receive a dedicated onboarding specialist to guide you through every step and ensure everything works perfectly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">All plans include a 7-day money-back guarantee. Cancel within 7 days for a pro-rated refund.</p>
          <p className="text-sm text-gray-500 mt-2">One-time setup fee applies to all new accounts.</p>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="bg-blue-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Have questions?</h2>
          <p className="text-gray-600 mb-6">Check out our FAQ or reach out to our team</p>
          <div className="flex gap-4 justify-center">
            <Link href="/faq">
              <Button variant="outline">View FAQ</Button>
            </Link>
            <a href="mailto:support@afterhourfix.com">
              <Button>Email Us</Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
