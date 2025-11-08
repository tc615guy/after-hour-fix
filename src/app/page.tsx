import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, Calendar, MessageSquare, TrendingUp, CheckCircle, Shield, Users, Navigation, DollarSign, Zap, Lock, Mic, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import AuthRedirect from '@/components/AuthRedirect'
import { PhoneCTA } from '@/components/PhoneCTA'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Receptionist for Plumbers, HVAC & Electricians | AfterHourFix',
  description: '24/7 smart AI receptionist that answers emergency calls, books jobs instantly, and never misses after-hours calls. Built for plumbers, HVAC companies, and electrical contractors. Book $1000+ jobs automatically.',
  keywords: [
    'AI receptionist for plumbers',
    '24/7 call answering for HVAC companies',
    'never miss a job call again',
    'after-hours answering service for trades',
    'voice AI receptionist books jobs for HVAC',
    'missed calls cost plumbing business',
    'AI receptionist books $1k+ jobs',
    'AI receptionist for electricians',
    'AI voice agent for trade business 24/7',
    'best answering service for trades companies',
    'voice AI booking system for home service business',
    'reduce missed job calls for HVAC contractor'
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AI Receptionist for Trades | Never Miss Emergency Calls',
    description: '24/7 AI voice receptionist for plumbers, HVAC & electrical contractors. Book jobs automatically, even at 3am.',
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Receptionist for Plumbers, HVAC & Electricians | AfterHourFix',
    description: '24/7 AI answering service that books $1000+ emergency jobs automatically',
  }
}

export default function HomePage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AfterHourFix',
    description: '24/7 AI voice receptionist for plumbers, HVAC contractors, and electrical contractors. Never miss emergency calls.',
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '249',
      highPrice: '999',
      offerCount: '3'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      ratingCount: '3'
    },
    featureList: [
      '24/7 call answering',
      'Smart AI receptionist',
      'Instant response time',
      'Automatic job booking',
      'Call recording and transcription',
      'Smart emergency routing',
      'Smart tech routing systems',
      'Emergency call handling',
      'Cal.com integration',
      'SMS and email confirmations',
      'Complete customization and control'
    ]
  }

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How to make sure no after-hours calls get missed for plumbing business?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Use a 24/7 AI voice receptionist that answers every call instantly, even at 3am. AfterHourFix automatically answers emergency calls, books jobs into your calendar, and escalates urgent situations.'
        }
      },
      {
        '@type': 'Question',
        name: "What's the best answering service for trades companies?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The best answering service for HVAC contractors, plumbers, and electrical contractors is one that books jobs automatically. AfterHourFix uses voice AI to answer calls in under 1 second.'
        }
      },
      {
        '@type': 'Question',
        name: 'How does automated call answering reduce missed job calls for HVAC contractors?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'An AI receptionist answers every call while you\'re on a job site, after hours, or during peak season. Voice AI booking system captures emergency AC repairs, furnace maintenance, and seasonal tune-ups automatically.'
        }
      },
      {
        '@type': 'Question',
        name: 'Can AI handle emergency electrical calls safely?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. AI voice agents for electrical contractors answer emergency calls 24/7, ask critical safety questions (burning smell, sparks), gather location details, and book appointments automatically.'
        }
      }
    ]
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Auth Redirect - handles magic link tokens on homepage */}
      <AuthRedirect />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">AfterHourFix</div>
          <nav className="hidden md:flex gap-6">
            <Link href="/features" className="text-sm hover:text-blue-600 transition">Features</Link>
            <Link href="/why-us" className="text-sm hover:text-blue-600 transition">Why Us</Link>
            <Link href="/pricing" className="text-sm hover:text-blue-600 transition">Pricing</Link>
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

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mb-4">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-4 py-1">
            ⚡ Smart AI Receptionist - Answers in Seconds
          </Badge>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          AI Receptionist for Plumbers, HVAC & Electricians
        </h1>
        <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
          <strong>Never miss a job call again.</strong> Our smart AI receptionist answers calls instantly, books $1000+ jobs automatically, and handles after-hours emergencies while you sleep.
        </p>
        <p className="text-lg text-gray-500 mb-4 max-w-2xl mx-auto">
          Built specifically for your trade with smart routing systems that understand emergency calls, schedule appointments, and book jobs into your calendar automatically.
        </p>
        <p className="text-sm text-blue-600 font-medium mb-8 max-w-2xl mx-auto">
          ✨ Intelligent call handling that works exactly how you want it—faster, smarter, and always reliable
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/auth/signup">
            <Button size="lg" className="text-lg px-8">Get Started</Button>
          </Link>
          <Link href="/why-us">
            <Button size="lg" variant="secondary" className="text-lg px-8">Why AfterHourFix</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="text-lg px-8">View Pricing</Button>
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-4">Setup in 10 minutes</p>
      </section>

      <div className="container mx-auto px-4">
        <PhoneCTA className="mb-16" />
      </div>

      {/* Security & Privacy */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-4xl font-bold mb-4">Your Business Data is Safe & Secure</h2>
            <p className="text-xl text-gray-600">Why AfterHourFix is Safe for Your Business</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 border-blue-100">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Enterprise-Grade Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Bank-level encryption for all call data and customer information. Your data is protected 24/7.</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">HIPAA Compliant Infrastructure</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Your customer data is protected by industry-leading security standards and compliance frameworks.</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">No Data Sharing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">We never sell or share your customer data with third parties. Your information stays private.</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Secure Payment Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">PCI-DSS compliant payment handling through Stripe. Your financial data is always secure.</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Regular Security Audits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Continuous monitoring and security testing to keep your business data safe from threats.</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Encrypted Backups</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Automatic daily backups with military-grade encryption. Your data is never lost.</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Verified Webhook Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Every system integration is cryptographically verified. Only authentic events are processed—no tampering.</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-green-900 font-semibold mb-2">Trusted by Trade Professionals Nationwide</p>
              <p className="text-green-800">Your customer information is protected by the same security standards used by major banks and healthcare providers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trade-Specific Value Props */}
      <section className="container mx-auto px-4 py-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Stop Losing $1000+ Jobs to Missed Calls</h2>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="flex gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Plumbers: Answer Emergency Burst Pipe Calls</h3>
                <p className="text-gray-600">Capture after-hours emergency calls for burst pipes, water heater failures, and drain backups. Book jobs automatically while you finish your current service.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">HVAC Contractors: 24/7 Emergency HVAC Booking</h3>
                <p className="text-gray-600">Voice AI receptionist books emergency AC repairs at 2am, schedules furnace maintenance, and reduces missed job calls during peak season.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Electricians: 24/7 Emergency Power Outage Response</h3>
                <p className="text-gray-600">AI receptionist handles emergency electrical calls, asks critical safety questions, and books urgent power outage, circuit breaker, and wiring repair calls instantly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Features */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="bg-green-100 text-green-700 border-green-200 px-4 py-1 mb-4">
              🚀 Smart Technology Built for Trades
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need. Nothing You Don't.</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Smart systems that understand your business, handle emergencies intelligently, and book jobs automatically—all while you focus on the work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle>Instant Response</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Calls answered in seconds, not minutes. Customers hear a real person (AI) immediately—no waiting, no hold music, no missed opportunities.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-green-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle>Smart Emergency Routing</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Automatically recognizes urgent calls (burst pipes, no heat, sparking) and routes them immediately. Regular maintenance calls get scheduled smartly.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-purple-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Mic className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle>Every Call Recorded</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Every conversation automatically saved and transcribed. Review what customers said, track your bookings, and see exactly how jobs are being handled.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-orange-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Lock className="w-6 h-6 text-orange-600" />
                  </div>
                  <CardTitle>Works Your Way</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Customize how calls are handled, what questions are asked, and how jobs get booked. Set your business hours, pricing, and routing exactly how you want.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-3 text-blue-900">Why Smart Technology Beats Everything Else</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Built for Your Business:</strong> Understands plumbing, HVAC, and electrical work like an expert
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Fair Pricing:</strong> Simple monthly cost—no hidden fees or surprise charges
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Your Data is Private:</strong> Customer information stays secure and never gets shared
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Grows With You:</strong> Add features as you need them, connect new tools anytime
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Complete Call Management for Trade Professionals</h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Best answering service for trades companies. Voice AI booking system that reduces missed job calls and books emergency work automatically.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Phone className="w-10 h-10 text-blue-600 mb-2" />
              <CardTitle>24/7 Call Answering</CardTitle>
              <CardDescription>
                Smart answering service that works around the clock. Handles emergency calls instantly, even at 3am. Never miss a job call again.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Calendar className="w-10 h-10 text-blue-600 mb-2" />
              <CardTitle>Instant Job Booking</CardTitle>
              <CardDescription>
                Voice AI receptionist books jobs for HVAC, plumbing, and electrical services directly into your calendar in real-time.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <MessageSquare className="w-10 h-10 text-blue-600 mb-2" />
              <CardTitle>Smart Confirmations</CardTitle>
              <CardDescription>
                Automated SMS & email confirmations for every booking. Reduces no-shows and keeps customers informed.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <TrendingUp className="w-10 h-10 text-blue-600 mb-2" />
              <CardTitle>Smart Reports & Tracking</CardTitle>
              <CardDescription>
                See exactly what's happening with every call. Track jobs booked, revenue generated, and how your receptionist is performing.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Competitive Comparison */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why AfterHourFix Beats the Competition</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              While others only offer basic call answering, we provide enterprise-grade scheduling intelligence
            </p>
          </div>

          <div className="max-w-6xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg shadow-lg overflow-hidden">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <tr>
                  <th className="text-left p-4 font-semibold">Feature</th>
                  <th className="text-center p-4 font-semibold">AfterHourFix</th>
                  <th className="text-center p-4 font-semibold bg-blue-500/90">Other AI Voice Agents</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 font-semibold">24/7 Call Answering</td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">Smart Technician Scheduling</td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">✗</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    Distance-Based Routing
                  </td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">✗</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">Traffic-Aware Travel Time</td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">✗</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Fuel Savings Calculator
                  </td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">✗</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Smart Gap Finder
                  </td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">✗</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold">Calendar Integration (Cal.com)</td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">Limited</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    Instant Response Time
                  </td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">─</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold flex items-center gap-2">
                    <Mic className="w-4 h-4 text-purple-600" />
                    Call Recording & Transcription
                  </td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">Limited</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Smart Emergency Routing
                  </td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">─</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    Smart Tech Routing Systems
                  </td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">─</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">CSV Import/Export</td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">✗</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold">Multi-Trade Templates (Plumbing/HVAC/Electrical)</td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">✗</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">One-Click Technician Assignment</td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">✗</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold">Auto-Conflict Detection</td>
                  <td className="text-center p-4"><CheckCircle className="w-6 h-6 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4 text-gray-400">✗</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center">
            <div className="inline-block bg-blue-50 border-2 border-blue-200 rounded-lg p-6 max-w-2xl">
              <p className="text-blue-900 font-semibold text-lg mb-2">🚀 The Only Platform Built Specifically for Trades</p>
              <p className="text-blue-800 mb-2">
                While competitors use generic solutions, AfterHourFix provides smart technology built specifically for your trade 
                with intelligent routing, instant responses, and complete control over how your business handles calls.
              </p>
              <p className="text-blue-700 text-sm">
                Plus smart scheduling systems, intelligent routing, fuel savings tracking, and technician management tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-blue-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="font-semibold mb-2">Connect Your Calendar</h3>
              <p className="text-gray-600 text-sm">Link your Cal.com account in under 2 minutes</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="font-semibold mb-2">Get Your Phone Number</h3>
              <p className="text-gray-600 text-sm">Get a new number or forward your existing one</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="font-semibold mb-2">Start Booking Jobs</h3>
              <p className="text-gray-600 text-sm">AI handles calls and fills your calendar automatically</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">How Trade Professionals Stop Missing Emergency Calls</h2>
        <p className="text-center text-gray-600 mb-12">See how plumbers, HVAC contractors, and electricians use AI voice agents to book $1000+ jobs</p>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
              </div>
              <p className="text-gray-700 mb-4">"This AI receptionist for plumbers booked 15 emergency jobs last week that I would have missed. Stopped losing $1000+ calls."</p>
              <p className="font-semibold">- Mike's Plumbing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
              </div>
              <p className="text-gray-700 mb-4">"AI handles emergency power outage calls perfectly. Asks about safety, books the job, and never misses a late-night electrical emergency."</p>
              <p className="font-semibold">- Rapid Electric</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
              </div>
              <p className="text-gray-700 mb-4">"Best answering service for HVAC companies. Voice AI receptionist books jobs 24/7 and sends confirmations. Reduced missed calls by 90%."</p>
              <p className="font-semibold">- All-Season HVAC</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ / Long-tail Keywords */}
      <section className="container mx-auto px-4 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Common Questions About AI Voice Receptionists for Trade Businesses</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How to make sure no after-hours calls get missed for plumbing business?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">Use a 24/7 AI voice receptionist that answers every call instantly, even at 3am. AfterHourFix automatically answers emergency calls, books jobs into your calendar, and escalates urgent situations. Never miss another $1000+ emergency job.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What's the best answering service for trades companies?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">The best answering service for HVAC contractors, plumbers, and electrical contractors is one that books jobs automatically. AfterHourFix uses voice AI to answer calls in under 1 second, understands trade-specific terminology, and books appointments directly into Cal.com.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How does automated call answering reduce missed job calls for HVAC contractors?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">An AI receptionist answers every call while you're on a job site, after hours, or during peak season. Voice AI booking system captures emergency AC repairs, furnace maintenance, and seasonal tune-ups automatically—reducing missed calls by 90%.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can AI handle emergency electrical calls safely?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">Yes. AI voice agents for electrical contractors answer emergency calls 24/7, ask critical safety questions (burning smell, sparks), gather location details, book appointments, and send confirmations. Sounds completely human and responds in under 1 second.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Stop Missing $1000+ Emergency Jobs?</h2>
          <p className="text-xl mb-8 opacity-90">Join hundreds of trade professionals using AfterHourFix AI receptionist for 24/7 call answering</p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8">Get Started</Button>
          </Link>
          <p className="text-sm mt-4 opacity-75">Setup in 10 minutes</p>
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
                <li><Link href="/why-us" className="hover:text-white transition">Why Us</Link></li>
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
