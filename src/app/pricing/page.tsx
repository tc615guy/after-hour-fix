import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

export default function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: 149,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
      description: 'Perfect for solo operators',
      features: [
        '500 AI minutes/month',
        '1 phone number',
        'Cal.com integration',
        'Email & SMS confirmations',
        'Call transcripts',
        'Weekly ROI reports',
      ],
    },
    {
      name: 'Pro',
      price: 299,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
      description: 'For growing businesses',
      features: [
        '1,200 AI minutes/month',
        '3 phone numbers',
        'Cal.com integration',
        'Email & SMS confirmations',
        'Call transcripts',
        'Weekly ROI reports',
        'Priority support',
        'Custom voice prompts',
      ],
      popular: true,
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

      {/* Pricing */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">Choose the plan that fits your business</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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

        <div className="mt-12 text-center">
          <p className="text-gray-600">All plans include a 14-day free trial. No credit card required to start.</p>
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
            <a href="tel:+18446075052">
              <Button>Call 844-607-5052</Button>
            </a>
            <a href="mailto:support@afterhourfix.com">
              <Button variant="outline">Email Us</Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
