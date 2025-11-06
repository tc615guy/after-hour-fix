import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ: AI Receptionist for Trades | Common Questions Answered',
  description: 'Frequently asked questions about AI receptionist services for plumbers, HVAC contractors, and electricians. Learn about 24/7 call answering, automatic booking, pricing, and more.',
  keywords: [
    'AI receptionist FAQ',
    'answering service questions',
    'how does AI receptionist work',
    'AI call answering for trades',
    'automated booking system FAQ',
    '24/7 answering service questions',
    'voice AI receptionist FAQ',
    'plumber call answering questions',
    'HVAC contractor AI questions',
    'electrician answering service FAQ',
    'missed call prevention FAQ',
    'automatic job booking questions',
  ],
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'FAQ: AI Receptionist for Trade Professionals',
    description: 'Common questions about 24/7 AI call answering and automatic job booking for trades',
    type: 'website',
    url: '/faq',
  },
}

export default function FAQPage() {
  const faqs = [
    {
      q: 'How to make sure no after-hours calls get missed for plumbing business?',
      a: 'Use a 24/7 AI voice receptionist that answers every call instantly, even at 3am. AfterHourFix automatically answers emergency calls, books jobs into your calendar, and escalates urgent situations. Never miss another $1000+ emergency job. The AI works 24/7/365 and responds in under 1 second.',
    },
    {
      q: "What's the best answering service for trades companies?",
      a: 'The best answering service for HVAC contractors, plumbers, and electrical contractors is one that books jobs automatically. AfterHourFix uses voice AI to answer calls in under 1 second, understands trade-specific terminology, books appointments directly into Cal.com, and sends instant confirmations. Unlike traditional answering services, our AI never sleeps and never misses a call.',
    },
    {
      q: 'How does automated call answering reduce missed job calls for HVAC contractors?',
      a: 'An AI receptionist answers every call while you\'re on a job site, after hours, or during peak season. Voice AI booking system captures emergency AC repairs, furnace maintenance, and seasonal tune-ups automatically—reducing missed calls by 90%. The AI works 24/7, so you never lose a potential $1000+ job to a missed call.',
    },
    {
      q: 'Can AI handle emergency electrical calls safely?',
      a: 'Yes. AI voice agents for electrical contractors answer emergency calls 24/7, ask critical safety questions (burning smell, sparks, power outages), gather location details, book appointments, and send confirmations. The AI is trained specifically for electrical emergencies and sounds completely human, responding in under 1 second.',
    },
    {
      q: 'How does AfterHourFix integrate with Cal.com?',
      a: 'Simply provide your Cal.com API key during onboarding. AfterHourFix automatically checks your real-time availability and books appointments directly into your calendar. The integration is seamless—customers get instant confirmations, and you see bookings appear in your calendar immediately.',
    },
    {
      q: 'What happens if I run out of AI minutes?',
      a: 'Your AI will continue to work seamlessly, and additional minutes are charged at $0.425/min. You can upgrade to a higher plan anytime. We\'ll notify you when you\'re approaching your limit so you can decide whether to upgrade or continue with pay-as-you-go minutes.',
    },
    {
      q: 'Can I use my existing phone number?',
      a: 'Yes! You can set up call forwarding from your existing number or get a new dedicated business number through our platform. We support number porting and can help you transition your existing number to work with our AI receptionist.',
    },
    {
      q: 'How accurate is the AI at booking jobs?',
      a: 'Our AI has a 95%+ booking accuracy rate. It\'s trained specifically for emergency service trades and confirms all details twice before booking. The AI asks for name, phone, address, service type, and preferred time, then double-checks before confirming the appointment.',
    },
    {
      q: 'What if the AI encounters a complex situation?',
      a: 'The AI can escalate to you via SMS for VIP customers or unclear emergencies. You maintain full control. The AI is smart enough to handle 95% of calls independently, but you can always step in when needed.',
    },
    {
      q: 'Do customers know they\'re talking to an AI?',
      a: 'The AI introduces itself as your automated booking assistant. Most customers appreciate the instant 24/7 service and don\'t mind that it\'s AI-powered. The conversation feels natural and human-like, so many customers don\'t even realize it\'s AI.',
    },
    {
      q: 'How do SMS confirmations work?',
      a: 'After each booking, the AI automatically sends a confirmation via SMS and/or email with all appointment details including date, time, address, and service type. Customers receive these confirmations instantly, reducing no-shows and keeping everyone informed.',
    },
    {
      q: 'Can I customize the AI\'s voice and prompts?',
      a: 'Yes! Pro and Premium plans include custom conversation scripts and prompts. You can customize how the AI greets customers, what questions it asks, and how it handles different situations. The AI learns your business preferences over time.',
    },
    {
      q: 'How much does an AI receptionist cost for a plumbing business?',
      a: 'AfterHourFix starts at $199/month for the Starter plan (300 AI minutes) and goes up to $599/month for Premium (1,200 AI minutes). There\'s a one-time $299 setup fee for professional configuration. Compare this to hiring a receptionist at $2,000-3,000/month, and you\'ll see significant savings.',
    },
    {
      q: 'Will AI receptionist work for my HVAC company during peak season?',
      a: 'Absolutely! The AI handles unlimited calls simultaneously, so it never gets overwhelmed during peak season. Whether you receive 10 calls or 100 calls in a day, the AI answers every single one instantly and books jobs automatically. This is especially valuable during summer AC season and winter furnace emergencies.',
    },
    {
      q: 'How do I know if customers are being booked correctly?',
      a: 'Every call is recorded and transcribed, so you can review exactly what happened. You\'ll receive real-time notifications when bookings are made, and you can see all appointments in your Cal.com calendar. The AI has a 95%+ accuracy rate, and you can always review and adjust bookings if needed.',
    },
    {
      q: 'Can the AI handle multiple phone numbers?',
      a: 'Yes! Starter plan includes 1 number, Pro includes 3 numbers, and Premium includes unlimited numbers. Each number can be configured independently with different business hours, routing rules, and settings.',
    },
    {
      q: 'What trades does AfterHourFix support?',
      a: 'AfterHourFix is optimized for plumbing, HVAC, electrical, locksmith, and towing services. The AI understands trade-specific terminology, recognizes emergency situations (burst pipes, no heat, power outages), and books jobs appropriately for each trade type.',
    },
    {
      q: 'How quickly can I get started?',
      a: 'Setup typically takes 2-3 business days after payment. You\'ll receive a dedicated onboarding specialist who will configure your AI, integrate your calendar, set up your phone number, and train you on the system. Most businesses are up and running within a week.',
    },
    {
      q: 'Is my customer data secure?',
      a: 'Yes! We use bank-level encryption, HIPAA-compliant infrastructure, and never share your customer data with third parties. All call recordings, transcripts, and customer information are encrypted and stored securely. We undergo regular security audits to ensure your data stays protected.',
    },
  ]

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">AfterHourFix</Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm hover:text-blue-600 transition">Home</Link>
            <Link href="/features" className="text-sm hover:text-blue-600 transition">Features</Link>
            <Link href="/pricing" className="text-sm hover:text-blue-600 transition">Pricing</Link>
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

      <section className="container mx-auto px-4 py-20 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-gray-600">Everything you need to know about AI receptionist services for trade professionals</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-lg">{faq.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center p-8 bg-blue-50 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-gray-600 mb-6">Our team is here to help</p>
          <div className="flex gap-4 justify-center">
            <a href="mailto:support@afterhourfix.com">
              <Button>Email Support</Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
