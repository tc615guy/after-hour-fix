import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, Calendar, MessageSquare, TrendingUp, CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Receptionist for Plumbers, HVAC & Electricians | AfterHourFix',
  description: '24/7 AI voice receptionist that answers emergency calls, books jobs instantly, and never misses after-hours calls. Built for plumbers, HVAC companies, and electrical contractors. Book $1000+ jobs automatically.',
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
  openGraph: {
    title: 'AI Receptionist for Trades | Never Miss Emergency Calls',
    description: '24/7 AI voice receptionist for plumbers, HVAC & electrical contractors. Book jobs automatically, even at 3am.',
    type: 'website',
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
      lowPrice: '149',
      highPrice: '299',
      offerCount: '2'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      ratingCount: '3'
    },
    featureList: [
      '24/7 call answering',
      'Automatic job booking',
      'Voice AI receptionist',
      'Emergency call handling',
      'Cal.com integration',
      'SMS and email confirmations'
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
            <Link href="#features" className="text-sm hover:text-blue-600 transition">Features</Link>
            <Link href="/demos" className="text-sm hover:text-blue-600 transition font-semibold">🎧 Hear It Live</Link>
            <Link href="/pricing" className="text-sm hover:text-blue-600 transition">Pricing</Link>
            <Link href="/faq" className="text-sm hover:text-blue-600 transition">FAQ</Link>
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
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          AI Receptionist for Plumbers, HVAC & Electricians
        </h1>
        <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
          <strong>Never miss a job call again.</strong> Our 24/7 AI voice receptionist answers emergency calls, books $1000+ jobs instantly, and handles after-hours calls while you sleep.
        </p>
        <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
          Voice AI that sounds human, books jobs automatically into your calendar, and sends confirmations. Built specifically for plumbing, HVAC, and electrical contractors.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg" className="text-lg px-8">Start Free Trial</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="text-lg px-8">View Pricing</Button>
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-4">No credit card required • Setup in 10 minutes</p>
      </section>

      {/* Real AI Calls */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <div className="text-4xl mb-3">🎧</div>
            <h2 className="text-3xl font-bold">Real AI Calls</h2>
            <p className="text-gray-600 mt-2 text-lg">Hear Your AI Receptionist in Action</p>
            <p className="text-gray-500 mt-3">These are 100% real calls handled by AfterHourFix AI. Listen to how naturally it books jobs, handles emergencies, and closes sales — even at 2am.</p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mt-3">
              <span>No actors</span>
              <span>•</span>
              <span>No scripts</span>
              <span>•</span>
              <span>100% real customers</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Plumbing */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Plumbing</span>
                  <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">emergency</span>
                </div>
                <CardTitle className="text-lg">Emergency Pipe Burst - 2am Call</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span>2:07</span>
                  <span>98% confidence</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <audio controls className="w-full">
                  <source src="/demos/plumbing-emergency.mp3" type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <Link href="/demos" className="block mt-2">
                  <Button variant="outline" className="w-full">Open Full Demo</Button>
                </Link>
                <p className="text-sm text-gray-600 mt-3">
                  <strong>Result:</strong> Booked immediately, priority upsell accepted, customer calmed
                </p>
              </CardContent>
            </Card>

            {/* HVAC */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">HVAC</span>
                  <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">emergency</span>
                </div>
                <CardTitle className="text-lg">No Heat in Winter - Evening Call</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span>2:32</span>
                  <span>97% confidence</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <audio controls className="w-full">
                  <source src="/demos/hvac-noheat.mp3" type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <Link href="/demos" className="block mt-2">
                  <Button variant="outline" className="w-full">Open Full Demo</Button>
                </Link>
                <p className="text-sm text-gray-600 mt-3">
                  <strong>Result:</strong> Emergency booking, priority upsell successful, family helped
                </p>
              </CardContent>
            </Card>

            {/* Electrical */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Electrical</span>
                  <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">emergency</span>
                </div>
                <CardTitle className="text-lg">Power Outage - Emergency Service Call</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span>1:45</span>
                  <span>97% confidence</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <audio controls className="w-full">
                  <source src="/demos/electrical-outage.mp3" type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <Link href="/demos" className="block mt-2">
                  <Button variant="outline" className="w-full">Open Full Demo</Button>
                </Link>
                <p className="text-sm text-gray-600 mt-3">
                  <strong>Result:</strong> Emergency electrical call booked, safety check completed, customer informed of pricing
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Link href="/demos">
              <Button>See All Demos</Button>
            </Link>
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

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Automated Call Answering Service for Trade Professionals</h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Best answering service for trades companies. Voice AI booking system that reduces missed job calls and books emergency work automatically.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Phone className="w-10 h-10 text-blue-600 mb-2" />
              <CardTitle>24/7 Call Answering</CardTitle>
              <CardDescription>
                After-hours answering service for trades. AI answers emergency calls instantly, even at 3am. Never miss a job call again.
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
              <CardTitle>ROI Tracking</CardTitle>
              <CardDescription>
                See exactly how many calls missed cost your plumbing business. Weekly reports show revenue generated.
              </CardDescription>
            </CardHeader>
          </Card>
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
              <p className="text-gray-600 text-sm">Choose a local number or port your existing one</p>
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

      {/* What’s New + Signup */}
      <section className="container mx-auto px-4 py-20" id="signup">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-3xl font-bold mb-4">What’s New</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Phone Porting Wizard with bill upload (PDF/image) and in‑app LOA signature</li>
              <li>Conditional Forwarding and Business Hours routing (forward during hours, AI after hours)</li>
              <li>Minutes usage bar + “Allow extra usage” toggle with automatic overage billing</li>
              <li>Admin Porting Docs viewer with secure downloads (LOA + bills)</li>
              <li>CSV import preview + column mapping with row‑level errors</li>
              <li>Emergency detection and on‑call technician SMS routing</li>
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-4">Get on the list</h2>
            <form action="/api/lead" method="post" className="space-y-3 bg-white border rounded-lg p-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Business Name*</label>
                <input name="businessName" required className="w-full border rounded px-3 py-2" placeholder="Acme Plumbing" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Contact Name*</label>
                <input name="contactName" required className="w-full border rounded px-3 py-2" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Trade</label>
                <select name="trade" className="w-full border rounded px-3 py-2">
                  <option value="">Select one</option>
                  <option>Plumbing</option>
                  <option>Electrical</option>
                  <option>HVAC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Phone</label>
                <input name="phone" className="w-full border rounded px-3 py-2" placeholder="(555) 123-4567" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Contact Email*</label>
                <input type="email" name="email" required className="w-full border rounded px-3 py-2" placeholder="you@company.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Which platform do you use for booking/calendar?</label>
                <select name="platform" className="w-full border rounded px-3 py-2">
                  <option value="">Select one</option>
                  <option>ServiceTitan</option>
                  <option>Housecall Pro</option>
                  <option>Jobber</option>
                  <option>FieldEdge</option>
                  <option>BuildOps</option>
                  <option>Google Calendar</option>
                  <option>Outlook</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">If Other, please specify</label>
                <input name="platformOther" className="w-full border rounded px-3 py-2" placeholder="Platform name" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white rounded px-4 py-2 font-semibold">Notify Me</button>
              <p className="text-xs text-gray-500">We’ll reach out from support@afterhourfix.com.</p>
            </form>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Stop Missing $1000+ Emergency Jobs?</h2>
          <p className="text-xl mb-8 opacity-90">Join hundreds of trade professionals using AfterHourFix AI receptionist for 24/7 call answering</p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8">Start Your Free Trial</Button>
          </Link>
          <p className="text-sm mt-4 opacity-75">No credit card required • Voice AI for trade business setup in 10 minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-white font-bold text-xl mb-4">AfterHourFix</div>
              <p className="text-sm">AI receptionist for trade professionals.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="/faq" className="hover:text-white transition">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="tel:+18446075052" className="hover:text-white transition">844-607-5052</a></li>
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
