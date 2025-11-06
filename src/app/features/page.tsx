import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, Calendar, MessageSquare, TrendingUp, Shield, Users, Navigation, DollarSign, Zap, Lock, Mic, AlertTriangle, Brain, Clock, CheckCircle, BarChart3, Settings, MapPin, FileText } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Receptionist Features for Trades | 24/7 Call Answering & Auto-Booking',
  description: 'Complete feature set for AI receptionist: 24/7 call answering, automatic job booking, smart emergency routing, technician scheduling, calendar integration, and more. Built for plumbers, HVAC, and electricians.',
  keywords: [
    'AI receptionist features',
    '24/7 call answering service features',
    'automatic job booking system',
    'smart emergency call routing',
    'technician scheduling software',
    'voice AI receptionist features',
    'after-hours answering service features',
    'AI booking system for trades',
    'plumber call answering features',
    'HVAC contractor AI receptionist',
    'electrical contractor call handling',
    'smart routing for service businesses',
    'calendar integration for trades',
    'missed call prevention system',
    'automated appointment booking',
  ],
  alternates: {
    canonical: '/features',
  },
  openGraph: {
    title: 'AI Receptionist Features | AfterHourFix',
    description: 'Complete feature set: 24/7 answering, auto-booking, smart routing, and more for trade professionals',
    type: 'website',
    url: '/features',
  },
}

export default function FeaturesPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AfterHourFix Features',
    applicationCategory: 'BusinessApplication',
    featureList: [
      '24/7 AI call answering',
      'Automatic job booking',
      'Smart emergency routing',
      'Technician scheduling',
      'Calendar integration',
      'Call recording and transcription',
      'SMS and email confirmations',
      'Service area validation',
      'Distance-based routing',
      'Fuel savings tracking',
    ],
  }

  const features = [
    {
      icon: Phone,
      title: '24/7 Instant Call Answering',
      description: 'Never miss a call again. Our AI receptionist answers every call in under 1 second, 24 hours a day, 7 days a week. Works even at 3am when emergency calls come in.',
      keywords: '24/7 call answering, instant response, never miss calls, after-hours answering',
    },
    {
      icon: Calendar,
      title: 'Automatic Job Booking',
      description: 'AI books appointments directly into your Cal.com calendar in real-time. No manual entry needed. Customers get instant confirmations via SMS and email.',
      keywords: 'automatic booking, calendar integration, real-time scheduling, instant confirmations',
    },
    {
      icon: AlertTriangle,
      title: 'Smart Emergency Routing',
      description: 'Intelligently recognizes urgent calls (burst pipes, no heat, power outages) and routes them immediately. Regular maintenance gets scheduled appropriately.',
      keywords: 'emergency call routing, urgent call handling, smart triage, priority routing',
    },
    {
      icon: Users,
      title: 'Intelligent Technician Scheduling',
      description: 'Automatically assigns jobs to the nearest available technician based on location, current jobs, and availability. Reduces travel time and fuel costs.',
      keywords: 'technician scheduling, smart routing, proximity-based assignment, automatic dispatch',
    },
    {
      icon: Navigation,
      title: 'Distance-Based Routing',
      description: 'Routes jobs to technicians based on real-time location and distance. Considers traffic patterns and current job locations for optimal efficiency.',
      keywords: 'distance-based routing, location-based scheduling, traffic-aware routing, efficient dispatch',
    },
    {
      icon: DollarSign,
      title: 'Fuel Savings Calculator',
      description: 'Track how much you save on fuel by routing technicians efficiently. See real-time savings and optimize your scheduling strategy.',
      keywords: 'fuel savings, cost tracking, route optimization, efficiency metrics',
    },
    {
      icon: Brain,
      title: 'AI Learning System',
      description: 'Your AI gets smarter with every call. Automatically learns from successful bookings, identifies knowledge gaps, and suggests improvements.',
      keywords: 'AI learning, machine learning, adaptive AI, continuous improvement',
    },
    {
      icon: Mic,
      title: 'Call Recording & Transcription',
      description: 'Every call is automatically recorded and transcribed. Review conversations, track customer needs, and improve your service quality.',
      keywords: 'call recording, call transcription, conversation history, call analytics',
    },
    {
      icon: MessageSquare,
      title: 'Automated Confirmations',
      description: 'SMS and email confirmations sent automatically after every booking. Reduces no-shows and keeps customers informed.',
      keywords: 'SMS confirmations, email confirmations, automated reminders, customer communication',
    },
    {
      icon: MapPin,
      title: 'Service Area Validation',
      description: 'Automatically checks if customer addresses are within your service area before booking. Prevents wasted trips and improves efficiency.',
      keywords: 'service area check, address validation, coverage area, geographic filtering',
    },
    {
      icon: BarChart3,
      title: 'Smart Analytics & Reports',
      description: 'Track calls, bookings, revenue, and AI performance. See detailed reports on missed opportunities, technician efficiency, and customer trends.',
      keywords: 'analytics, reporting, call tracking, business intelligence, performance metrics',
    },
    {
      icon: Settings,
      title: 'Complete Customization',
      description: 'Customize business hours, pricing, service areas, technician assignments, and AI conversation scripts. Full control over how your business operates.',
      keywords: 'customization, business configuration, flexible settings, personalized AI',
    },
    {
      icon: FileText,
      title: 'Knowledge Base Integration',
      description: 'Upload FAQs, service information, and business policies. AI uses this knowledge to answer customer questions accurately.',
      keywords: 'knowledge base, FAQ management, information repository, AI training data',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level encryption, HIPAA-compliant infrastructure, and regular security audits. Your customer data is always protected.',
      keywords: 'security, encryption, data protection, HIPAA compliance, enterprise security',
    },
    {
      icon: Clock,
      title: 'Real-Time Data Sync',
      description: 'Pricing, hours, technicians, and availability sync automatically to your AI. Always has the latest information without manual updates.',
      keywords: 'real-time sync, automatic updates, live data, dynamic configuration',
    },
    {
      icon: CheckCircle,
      title: 'Multi-Trade Support',
      description: 'Optimized for plumbing, HVAC, electrical, locksmith, and towing services. Trade-specific emergency detection and booking flows.',
      keywords: 'multi-trade support, trade-specific AI, industry optimization, specialized features',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">AfterHourFix</Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm hover:text-blue-600 transition">Home</Link>
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
          Complete AI Receptionist Features for Trade Professionals
        </h1>
        <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
          Everything you need to never miss a call, book jobs automatically, and run your service business more efficiently.
        </p>
        <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
          Built specifically for plumbers, HVAC contractors, electricians, and other trade professionals.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg" className="text-lg px-8">Get Started</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="text-lg px-8">View Pricing</Button>
          </Link>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features That Work Together</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Every feature is designed to help you capture more jobs, reduce missed calls, and run your business more efficiently.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="border-2 hover:border-blue-300 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-gray-700">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Feature Categories */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Organized by What Matters Most</h2>
            <p className="text-xl text-gray-600">Features grouped by how they help your business</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <Zap className="w-10 h-10 text-blue-600 mb-4" />
                <CardTitle className="text-2xl">Call Management</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>24/7 instant call answering</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Call recording & transcription</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Smart emergency detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Service area validation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200">
              <CardHeader>
                <Calendar className="w-10 h-10 text-green-600 mb-4" />
                <CardTitle className="text-2xl">Booking & Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Automatic job booking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Cal.com integration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>SMS & email confirmations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Reschedule & cancel support</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200">
              <CardHeader>
                <Users className="w-10 h-10 text-purple-600 mb-4" />
                <CardTitle className="text-2xl">Operations & Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Smart technician routing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Fuel savings tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Analytics & reporting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>AI learning system</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to See All Features in Action?</h2>
          <p className="text-xl mb-8 opacity-90">Get started today and experience the complete feature set</p>
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
              <p className="text-sm">AI receptionist for trade professionals.</p>
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

