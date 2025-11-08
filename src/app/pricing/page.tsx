import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { PhoneCTA } from '@/components/PhoneCTA'

export const metadata: Metadata = {
  title: 'Pricing: AI Receptionist for Trades | Affordable 24/7 Call Answering',
  description: 'Simple, transparent pricing for AI receptionist services. Plans from $249/month with premium coverage options. Includes 24/7 call answering, automatic booking, and calendar integration.',
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
    description: 'Simple, transparent pricing starting at $249/month. No hidden fees.',
    type: 'website',
    url: '/pricing',
  },
}

export default function PricingPage() {
  const activePlans = [
    {
      name: 'Standard',
      priceDisplay: '$249',
      billingUnit: '/month',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
      description: 'Great fit for solo and small teams',
      features: [
        '300 AI minutes/month included',
        '1 phone number included',
        'OpenAI Realtime AI assistant',
        'Auto-syncs business data (pricing, hours, technicians)',
        'Cal.com integration',
        'Email & SMS confirmations',
        'Call transcripts',
        'Smart reports & tracking',
      ],
      taxCategory: 'General - Electronically Supplied Services',
    },
    {
      name: 'Pro',
      priceDisplay: '$699',
      billingUnit: '/month',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
      description: 'For busy multi-tech teams',
      features: [
        '800 AI minutes/month included',
        '1 phone number included',
        'OpenAI Realtime AI assistant',
        'Auto-syncs business data (pricing, hours, technicians)',
        'Cal.com integration',
        'Email & SMS confirmations',
        'Call transcripts',
        'Smart reports & tracking',
        'Priority support',
        'Custom conversation scripts',
      ],
      taxCategory: 'General - Electronically Supplied Services',
      popular: true,
    },
    {
      name: 'Premium',
      priceDisplay: '$999',
      billingUnit: '/month',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ULTRA,
      description: 'For high-volume operations',
      features: [
        '1,200 AI minutes/month included',
        '1 phone number included',
        'OpenAI Realtime AI assistant',
        'Auto-syncs business data (pricing, hours, technicians)',
        'Cal.com integration',
        'Email & SMS confirmations',
        'Call transcripts',
        'Smart reports & tracking',
        'Priority support',
        'Custom conversation scripts',
        'Dedicated account manager',
      ],
      taxCategory: 'General - Electronically Supplied Services',
    },
    {
      name: 'Overage',
      priceDisplay: '$0.749',
      billingUnit: '/min',
      description: 'Pay-as-you-go minutes beyond plan allowances',
      features: [
        'Billed only on actual usage',
        'Applies automatically once plan minutes are exhausted',
        'Includes call recording, transcripts, & notifications',
        'Matches plan-level routing rules',
      ],
      taxCategory: 'General - Electronically Supplied Services',
      ctaLabel: 'Contact Sales',
    },
  ]

  const archivedPlans = [
    {
      name: 'Pro (Archived)',
      priceDisplay: '$399',
      billingUnit: '/month',
      description: 'Legacy pricing for existing customers',
      taxCategory: 'General - Electronically Supplied Services',
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
          {activePlans.map((plan) => (
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
                  <span className="text-4xl font-bold">{plan.priceDisplay}</span>
                  <span className="text-gray-600">{plan.billingUnit}</span>
                </div>
                {plan.taxCategory && (
                  <p className="text-xs text-gray-500 mt-2">{plan.taxCategory}</p>
                )}
              </CardHeader>
              <CardContent>
                {plan.features ? (
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600">
                    Contact our team to learn more about this plan.
                  </p>
                )}
              </CardContent>
              <CardFooter>
                {plan.ctaLabel ? (
                  <a href="mailto:sales@afterhourfix.com" className="w-full">
                    <Button className="w-full" variant="outline">
                      {plan.ctaLabel}
                    </Button>
                  </a>
                ) : (
                  <Link href="/auth/signup" className="w-full">
                    <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                      Get Started
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Archived Plans */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-semibold text-center mb-6">Archived Plans</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {archivedPlans.map((plan) => (
              <Card key={plan.name} className="border-dashed border-gray-300">
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-3">
                    <span className="text-3xl font-bold">{plan.priceDisplay}</span>
                    <span className="text-gray-600">{plan.billingUnit}</span>
                  </div>
                  {plan.taxCategory && (
                    <p className="text-xs text-gray-500 mt-2">{plan.taxCategory}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Archived plans remain available for existing customers only. Contact support for questions about legacy pricing.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* One-Time Setup Fee */}
        <div className="mt-16 mb-8">
          <Card className="max-w-3xl mx-auto border-2 border-blue-200 bg-blue-50/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl mb-2">One-Time Setup Fee: $299 (non-refundable)</CardTitle>
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
                  <br />
                  <span className="mt-2 block text-xs text-gray-500">Setup fees are non-refundable.</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">One-time setup fee applies to all new accounts.</p>
        </div>
      </section>

      <div className="container mx-auto px-4">
        <PhoneCTA className="mb-16" title="Need help picking the right plan?" />
      </div>

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

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-white font-bold text-xl mb-4">AfterHourFix</div>
              <p className="text-sm mb-4">AI receptionist for trade professionals.</p>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=425+Sophie+Hill+Court,+Murfreesboro,+TN+37128" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-white transition block"
              >
                425 Sophie Hill Court<br />
                Murfreesboro, TN 37128
              </a>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="/faq" className="hover:text-white transition">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms</Link></li>
                <li><Link href="/opt-in" className="hover:text-white transition">SMS Opt-In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="tel:8446075052" className="hover:text-white transition">Call 844-607-5052</a></li>
                <li><a href="mailto:support@afterhourfix.com" className="hover:text-white transition">support@afterhourfix.com</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © {new Date().getFullYear()} AfterHourFix. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
