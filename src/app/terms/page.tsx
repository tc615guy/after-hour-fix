import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'
import { PhoneCTA } from '@/components/PhoneCTA'

export const metadata: Metadata = {
  title: 'Terms of Service | AfterHourFix',
  description: 'Terms of Service for AfterHourFix AI receptionist platform. Read our terms and conditions for using our 24/7 call answering and automatic booking services.',
  alternates: {
    canonical: '/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b sticky top-0 bg-white z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">AfterHourFix</Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm hover:text-blue-600 transition">Home</Link>
            <Link href="/features" className="text-sm hover:text-blue-600 transition">Features</Link>
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

      <article className="container mx-auto px-4 py-20 max-w-3xl prose prose-blue">
        <h1>Terms of Service</h1>
        <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>

        <PhoneCTA className="not-prose my-8" title="Have a question about our terms?" description="Call us anytime to review any clause or requirement." />

        <h2>Agreement to Terms</h2>
        <p>
          By accessing or using AfterHourFix, you agree to be bound by these Terms of Service. If you disagree with any part
          of these terms, you may not access the service.
        </p>

        <h2>Description of Service</h2>
        <p>
          AfterHourFix provides an AI-powered phone receptionist service that answers calls, books appointments via Cal.com,
          and sends confirmations to customers. The service is designed for trade professionals including plumbers, HVAC
          technicians, locksmiths, and towing services.
        </p>

        <h2>Account Registration</h2>
        <ul>
          <li>You must provide accurate and complete information</li>
          <li>You are responsible for maintaining the security of your account</li>
          <li>You must be at least 18 years old to use this service</li>
          <li>One account per business is permitted</li>
        </ul>

        <h2>Subscription and Billing</h2>
        <h3>Payment</h3>
        <ul>
          <li>All plans are billed monthly via Stripe</li>
          <li>One-time setup fee of $299 applies to all new accounts</li>
          <li>Pricing is subject to change with 30 days notice</li>
          <li>Additional AI minutes beyond your plan are charged at $0.425/minute</li>
        </ul>

        <h3>Cancellation</h3>
        <ul>
          <li>You may cancel your subscription at any time</li>
          <li>No refunds for partial months</li>
          <li>Data retained for 30 days after cancellation</li>
        </ul>

        <h2>Acceptable Use</h2>
        <p>You agree NOT to use AfterHourFix to:</p>
        <ul>
          <li>Violate any laws or regulations</li>
          <li>Harass, abuse, or harm others</li>
          <li>Distribute spam or unsolicited messages</li>
          <li>Impersonate others or provide false information</li>
          <li>Interfere with the service or other users</li>
        </ul>

        <h2>Service Availability</h2>
        <p>
          We strive for 99.9% uptime but cannot guarantee uninterrupted service. We are not liable for:
        </p>
        <ul>
          <li>Missed calls due to service outages</li>
          <li>Third-party service failures (Vapi, Cal.com, etc.)</li>
          <li>Network or connectivity issues</li>
        </ul>

        <h2>Intellectual Property</h2>
        <p>
          AfterHourFix and its original content, features, and functionality are owned by AfterHourFix and are protected
          by international copyright, trademark, and other intellectual property laws.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, AfterHourFix shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages resulting from your use of the service.
        </p>

        <h2>Indemnification</h2>
        <p>
          You agree to indemnify and hold AfterHourFix harmless from any claims arising from your use of the service or
          violation of these terms.
        </p>

        <h2>Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes
          acceptance of the new terms.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about these Terms, contact us at:<br />
          Email: support@afterhourfix.com
        </p>
      </article>

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
