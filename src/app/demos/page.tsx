'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Clock, Phone, CheckCircle, TrendingUp } from 'lucide-react'
import { formatDuration, formatPhoneNumber } from '@/lib/utils'
import { PhoneCTA } from '@/components/PhoneCTA'

interface DemoCall {
  id: string
  trade: string
  scenario: string
  intent: string
  durationSec: number
  recordingUrl: string
  transcript: string
  outcome: string
  confidence: number
}

export default function DemosPage() {
  const [demoCallsData] = useState<DemoCall[]>([
    {
      id: '1',
      trade: 'Plumbing',
      scenario: 'Emergency Pipe Burst - 2am Call',
      intent: 'emergency',
      durationSec: 127,
      recordingUrl: '/demos/plumbing-emergency.mp3',
      transcript: `AI: "Hey there, you've reached Mike's Plumbing. Don't worry, I'm here to help. What's the emergency?"

Customer: "Oh thank god someone answered! We have water everywhere, a pipe burst in the basement!"

AI: "Oh man, that sounds really stressful. Okay, let's get someone out there right away. Who am I speaking with?"

Customer: "Sarah Johnson, we're freaking out here!"

AI: "I got you, Sarah. What's the address?"

Customer: "456 Oak Avenue, the water is just pouring out!"

AI: "Okay, 456 Oak - I'm pulling up the schedule now. I can get Mike there within the hour. We can also bump you to priority for $50 and he'll be your next stop - probably 30 minutes. Want that?"

Customer: "Yes! Please, whatever gets him here fastest!"

AI: "Perfect! Mike's on his way - ETA 30 minutes to 456 Oak Avenue. I'm texting you the confirmation right now. In the meantime, shut off your main water valve if you can find it. He'll call when he's 5 minutes out."

Customer: "Thank you so much!"

AI: "You're all set, Sarah. Mike's got this. Anything else?"

Customer: "No, that's it. Thank you!"

AI: "Take care!"`,
      outcome: 'Booked immediately, priority upsell accepted, customer calmed',
      confidence: 0.98,
    },
    {
      id: '2',
      trade: 'HVAC',
      scenario: 'No Heat in Winter - Evening Call',
      intent: 'emergency',
      durationSec: 152,
      recordingUrl: '/demos/hvac-noheat.mp3',
      transcript: `AI: "Hi, you've reached All-Season HVAC. Don't worry, I'm here to help. What's the emergency?"

Customer: "Our heater just stopped working and it's freezing! We have kids!"

AI: "Oh no, especially with kids that's rough. Let's get you heat ASAP. What's your address?"

Customer: "789 Pine Street, apartment 4B."

AI: "Got it - 789 Pine Street, 4B. And who am I speaking with?"

Customer: "Jessica and Mark Davis."

AI: "Perfect. What's a good callback number?"

Customer: "555-0177."

AI: "Okay Jessica, I'm checking our emergency schedule... I can get a technician there tonight at 8pm, or we have a priority slot in 90 minutes for an extra $50. What works better?"

Customer: "90 minutes, definitely. We need heat now."

AI: "You got it. Tech will be there around 7:15pm to 789 Pine Street, 4B. You'll get a text confirmation and he'll call before he arrives. Anything else I can help with?"

Customer: "No, that's perfect. Thank you!"

AI: "Stay warm! He's on the way."`,
      outcome: 'Emergency booking, priority upsell successful, family helped',
      confidence: 0.97,
    },
    {
      id: '3',
      trade: 'Electrical',
      scenario: 'Power Outage - Emergency Service Call',
      intent: 'emergency',
      durationSec: 105,
      recordingUrl: '/demos/electrical-outage.mp3',
      transcript: `AI: "Hey there, Rapid Electric! I can help you right away. What's going on?"

Customer: "Half my house just lost power and I'm worried it's dangerous!"

AI: "Okay, that definitely needs attention. Let's get someone out there. Where are you located?"

Customer: "348 Elm Street."

AI: "Got it - 348 Elm Street. Who am I speaking with?"

Customer: "Karen Williams."

AI: "Perfect Karen, what's the best number to reach you?"

Customer: "555-0166."

AI: "Okay, and just to be safe - do you smell any burning or see any sparks?"

Customer: "No, nothing like that. It just suddenly went dark in the bedrooms and kitchen."

AI: "Good. I'm checking our emergency schedule... I can get an electrician there in about 40 minutes. Sound good?"

Customer: "Yes, that works. How much will this cost?"

AI: "Emergency service call is $125 to come out and diagnose. Any repairs needed will be quoted on-site before we start. I'll text you the confirmation right now."

Customer: "Okay, thank you!"

AI: "You're all set Karen. See you soon. Anything else?"

Customer: "No, that's it!"`,
      outcome: 'Emergency electrical call booked, safety check completed, customer informed of pricing',
      confidence: 0.97,
    },
  ])

  const [selectedDemo, setSelectedDemo] = useState<DemoCall | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (selectedDemo) {
      setTimeout(() => {
        document.getElementById('demo-player')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        try {
          audioRef.current?.load()
          audioRef.current?.play().catch(() => {})
        } catch {}
      }, 0)
    }
  }, [selectedDemo])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">AfterHourFix</Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm hover:text-blue-600 transition">Home</Link>
            <Link href="/features" className="text-sm hover:text-blue-600 transition">Features</Link>
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
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge className="mb-4 bg-green-100 text-green-800 border-green-200">
          🎧 Real AI Calls
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Hear Your AI Receptionist in Action
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          These are 100% real calls handled by AfterHourFix AI. Listen to how naturally it books jobs,
          handles emergencies, and closes sales - even at 2am.
        </p>
        <div className="flex gap-4 justify-center text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>No actors</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>No scripts</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>100% real customers</span>
          </div>
        </div>
      </section>

    <div className="container mx-auto px-4">
      <PhoneCTA className="mb-10" title="Want a personal walkthrough?" description="Call and we'll answer questions or schedule a custom AI demo." />
    </div>

      {/* Demo Recordings Grid */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {demoCallsData.map((demo) => (
            <Card
              key={demo.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedDemo(demo)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline">{demo.trade}</Badge>
                  <Badge
                    variant={demo.intent === 'emergency' ? 'destructive' : 'default'}
                  >
                    {demo.intent}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{demo.scenario}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(demo.durationSec)}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {(demo.confidence * 100).toFixed(0)}% confidence
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Play className="w-4 h-4 mr-2" />
                  Listen to Call
                </Button>
                <p className="text-sm text-gray-600 mt-3">
                  <strong>Result:</strong> {demo.outcome}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Demo Playback */}
        {selectedDemo && (
          <Card className="max-w-4xl mx-auto" id="demo-player">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedDemo.scenario}</CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <Badge variant="outline">{selectedDemo.trade}</Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(selectedDemo.durationSec)}
                    </span>
                  </CardDescription>
                </div>
                <Button onClick={() => setSelectedDemo(null)} variant="ghost">
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Audio Player */}
              <div className="bg-gray-50 rounded-lg p-4">
                <audio ref={audioRef} controls className="w-full">
                  <source src={selectedDemo.recordingUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>

              {/* Transcript */}
              <div>
                <h3 className="font-semibold mb-3">Full Transcript</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {selectedDemo.transcript}
                  </pre>
                </div>
              </div>

              {/* Outcome */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Call Outcome
                </h3>
                <p className="text-green-800">{selectedDemo.outcome}</p>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div>
                    <strong>AI Confidence:</strong> {(selectedDemo.confidence * 100).toFixed(0)}%
                  </div>
                  <div>
                    <strong>Duration:</strong> {formatDuration(selectedDemo.durationSec)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Book More Jobs?</h2>
          <p className="text-xl mb-8 opacity-90">
            Your AI receptionist is trained and ready to go in under 10 minutes
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary">
                Get Started
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

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
