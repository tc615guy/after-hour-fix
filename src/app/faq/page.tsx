import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function FAQPage() {
  const faqs = [
    {
      q: 'How does AfterHourFix integrate with Cal.com?',
      a: 'Simply provide your Cal.com API key during onboarding. AfterHourFix will automatically check your availability and book appointments directly into your calendar.',
    },
    {
      q: 'What happens if I run out of AI minutes?',
      a: 'Your AI will continue to work, and additional minutes are charged at $0.10/min. You can upgrade to a higher plan anytime.',
    },
    {
      q: 'Can I use my existing phone number?',
      a: 'Yes! You can port your existing number or get a new local number through our platform.',
    },
    {
      q: 'How accurate is the AI at booking jobs?',
      a: 'Our AI has a 95%+ booking accuracy rate. It\'s trained specifically for emergency service trades and confirms all details twice before booking.',
    },
    {
      q: 'What if the AI encounters a complex situation?',
      a: 'The AI can escalate to you via SMS for VIP customers or unclear emergencies. You maintain full control.',
    },
    {
      q: 'Do customers know they\'re talking to an AI?',
      a: 'The AI introduces itself as your automated booking assistant. Most customers appreciate the instant 24/7 service.',
    },
    {
      q: 'How do SMS confirmations work?',
      a: 'After each booking, the AI automatically sends a confirmation via SMS and/or email with all appointment details.',
    },
    {
      q: 'Can I customize the AI\'s voice and prompts?',
      a: 'Currently, all users get our optimized voice and prompts designed specifically for emergency home service calls. Custom voice and prompts are coming soon for Pro plan users.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">AfterHourFix</Link>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-gray-600">Everything you need to know about AfterHourFix</p>
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
            <a href="tel:+18446075052">
              <Button>Call 844-607-5052</Button>
            </a>
            <a href="mailto:support@afterhourfix.com">
              <Button variant="outline">Email Support</Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
