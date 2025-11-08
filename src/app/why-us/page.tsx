import Link from 'next/link'
import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, PhoneOff, CalendarX, TimerOff, Siren, DollarSign, ShieldCheck, CheckCircle2, BarChart3 } from 'lucide-react'
import { PhoneCTA } from '@/components/PhoneCTA'

export const metadata: Metadata = {
  title: 'Why AfterHourFix | Avoid AI Booking Nightmares',
  description:
    'See real examples of what goes wrong with generic AI phone agents—double bookings, missed emergencies, call drops—and why AfterHourFix is the #1 choice for trade businesses that need guaranteed dispatch reliability.',
  alternates: {
    canonical: '/why-us',
  },
  openGraph: {
    title: 'Why AfterHourFix | Prevent AI Scheduling Disasters',
    description:
      'Other AI agents double-book techs, miss emergencies, and drop high-value calls. AfterHourFix prevents revenue loss with dispatch-grade logic and trade-trained AI.',
    type: 'website',
    url: '/why-us',
  },
}

const scareScenarios = [
  {
    title: 'Double-Booked Techs',
    icon: CalendarX,
    loss: '$1,200 heat pump install refunded + angry reviews',
    description:
      'Generic AI booked the same tech for two emergency furnace calls at 2pm. One customer waited 3 hours, cancelled, and left a one-star review. Refund + labor = $1,200 lost instantly.',
  },
  {
    title: 'Emergency With No Dispatch',
    icon: Siren,
    loss: '$950 burst pipe repair sent to competitor',
    description:
      "Call center bot took a message, never dispatched. Homeowner called the next company on Google and got their basement flood handled. You're out the $950 job and the referral.",
  },
  {
    title: 'Tech Shows Up Late',
    icon: TimerOff,
    loss: '$680 ductless service rescheduled',
    description:
      'AI forgot to factor drive time. Tech arrived 45 minutes late to a landlord with tenants waiting. Job rescheduled, landlord asked to be put on “manual scheduling only.”',
  },
  {
    title: 'Call Drop During Quote',
    icon: PhoneOff,
    loss: '$780 water heater replacement',
    description:
      'Voice bot cut out mid-call while the homeowner was reading off the serial plate. Caller assumed you hung up and went with a national franchise that answered on the second try.',
  },
]

const revenueMath = [
  {
    label: 'Average HVAC emergency repair',
    value: '$850',
  },
  {
    label: 'Average plumbing burst repair',
    value: '$975',
  },
  {
    label: 'Average electrical panel call',
    value: '$1,150',
  },
]

const whyAfterHourFix = [
  {
    title: 'Dispatch-grade emergency logic',
    description:
      '30-minute prep buffer, real drive-time math, and escalation rules ensure the right tech is on the truck with an accurate ETA.',
    icon: ShieldCheck,
  },
  {
    title: 'Real-time calendars + double-booking guard',
    description:
      'We cross-check technician calendars before confirming any job. If a slot is taken, the AI finds the next conflict-free tech automatically.',
    icon: CheckCircle2,
  },
  {
    title: 'Every call answered, every detail logged',
    description:
      'Call recordings, transcripts, SMS/email confirmations, and emergency alerts keep your team in the loop. No more “I never got the message.”',
    icon: BarChart3,
  },
]

export default function WhyUsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            AfterHourFix
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm hover:text-blue-600 transition">
              Home
            </Link>
            <Link href="/features" className="text-sm hover:text-blue-600 transition">
              Features
            </Link>
            <Link href="/why-us" className="text-sm text-blue-600 font-semibold">
              Why Us
            </Link>
            <Link href="/pricing" className="text-sm hover:text-blue-600 transition">
              Pricing
            </Link>
            <Link href="/faq" className="text-sm hover:text-blue-600 transition">
              FAQ
            </Link>
            <Link href="/contact" className="text-sm hover:text-blue-600 transition">
              Contact
            </Link>
          </nav>
          <div className="flex gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-sm font-semibold mb-6">
            <AlertTriangle className="w-4 h-4" />
            When generic AI handles your phones, your revenue is on the line.
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why AfterHourFix? Because bad AI scheduling costs real money.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            We’ve replaced chatbots, virtual receptionists, and off-the-shelf voice agents that
            double-book techs, miss dispatches, and lose emergency calls. Here’s what we see every week
            before companies switch to AfterHourFix.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8">
                Start With AfterHourFix
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Talk With Dispatch Experts
              </Button>
            </Link>
          </div>
        </section>

        {/* Scare Scenarios */}
        <section className="py-16 bg-white border-t border-b border-gray-100">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Real failure cases from other AI systems</h2>
              <p className="text-gray-600">
                These are the exact issues trade companies bring to us after trying “AI receptionists” that
                weren’t built for dispatch-critical work.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {scareScenarios.map((scenario) => (
                <Card key={scenario.title} className="border border-red-100 bg-red-50/20">
                  <CardHeader className="flex flex-row items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <scenario.icon className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">{scenario.title}</CardTitle>
                      <CardDescription className="text-sm text-red-600 font-medium">
                        Lost revenue: {scenario.loss}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 leading-relaxed">{scenario.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Revenue math */}
        <section className="py-16 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/10 text-sm font-semibold">
                <DollarSign className="w-4 h-4" />
                Every good call is worth serious revenue.
              </div>
              <h2 className="text-3xl font-bold mt-4">Missing one “perfect call” wipes out your monthly spend.</h2>
              <p className="text-blue-100 mt-4">
                AfterHourFix pays for itself with a single booked job. Our clients recoup the monthly fee on day one.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {revenueMath.map((item) => (
                <Card key={item.label} className="bg-white/10 border border-white/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">{item.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-white">{item.value}</p>
                    <p className="text-sm text-blue-100 mt-2">Lose one call like this and the month is in the red.</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why AfterHourFix works */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Why we’re the #1 choice for dispatch reliability</h2>
              <p className="text-gray-600">
                AfterHourFix is engineered specifically for plumbers, HVAC pros, electricians, and specialty trades who
                can’t afford a single scheduling mistake.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {whyAfterHourFix.map((item) => (
                <Card key={item.title} className="border border-blue-100">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                      <item.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl text-gray-900">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="max-w-4xl mx-auto mt-12 text-center">
              <p className="text-gray-600">
                Every call is recorded, every booking is logged, and every emergency is escalated. The AI follows your SOP
                and we monitor quality continuously. That’s why teams switch to AfterHourFix after testing other options.
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4">
          <PhoneCTA className="mb-16" title="Ready to protect every high-value call?" />
        </div>
      </main>

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
                425 Sophie Hill Court
                <br />
                Murfreesboro, TN 37128
              </a>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/features" className="hover:text-white transition">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/why-us" className="hover:text-white transition">
                    Why Us
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white transition">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-white transition">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/opt-in" className="hover:text-white transition">
                    SMS Opt-In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="tel:8446075052" className="hover:text-white transition">
                    Call 844-607-5052
                  </a>
                </li>
                <li>
                  <a href="mailto:support@afterhourfix.com" className="hover:text-white transition">
                    support@afterhourfix.com
                  </a>
                </li>
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


