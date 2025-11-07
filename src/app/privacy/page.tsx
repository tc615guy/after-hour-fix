import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'
import { PhoneCTA } from '@/components/PhoneCTA'

export const metadata: Metadata = {
  title: 'Privacy Policy | AfterHourFix',
  description: 'Privacy Policy for AfterHourFix. Learn how we protect your customer data, call recordings, and business information with enterprise-grade security.',
  alternates: {
    canonical: '/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrivacyPage() {
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
        <h1>Privacy Policy</h1>
        <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>

        <PhoneCTA className="not-prose my-8" title="Need clarification on our privacy practices?" description="Call us to discuss how we secure your data and recordings." />

        <h2>Introduction</h2>
        <p>
          AfterHourFix ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect,
          use, disclose, and safeguard your information when you use our AI receptionist service.
        </p>

        <h2>Information We Collect</h2>
        <h3>Personal Information</h3>
        <ul>
          <li>Account information (name, email address, phone number)</li>
          <li>Business information (company name, trade type, timezone)</li>
          <li>Calendar integration credentials (Cal.com API keys, encrypted and secured)</li>
          <li>Payment information (processed securely through Stripe)</li>
        </ul>

        <h3>Call Data</h3>
        <ul>
          <li>Call recordings and transcripts</li>
          <li>Customer phone numbers and contact information</li>
          <li>Booking details and appointment information</li>
          <li>Call duration and metadata</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>To provide and maintain our AI receptionist service</li>
          <li>To process bookings and send confirmations</li>
          <li>To generate weekly ROI reports</li>
          <li>To improve our AI models and service quality</li>
          <li>To communicate with you about your account</li>
          <li>To comply with legal obligations</li>
        </ul>

        <h2>Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your data, including:
        </p>
        <ul>
          <li>Encryption of sensitive data (API keys, passwords)</li>
          <li>Secure HTTPS connections</li>
          <li>Regular security audits</li>
          <li>Restricted access to personal information</li>
        </ul>

        <h2>Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li><strong>Stripe:</strong> Payment processing</li>
          <li><strong>Vapi.ai:</strong> Voice AI and call handling</li>
          <li><strong>Cal.com:</strong> Calendar and booking management</li>
          <li><strong>Supabase:</strong> Authentication and database</li>
          <li><strong>Resend:</strong> Email delivery</li>
        </ul>

        <h2>Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed to provide services. You may request deletion
          of your data by contacting us at support@afterhourfix.com.
        </p>

        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data</li>
          <li>Opt-out of marketing communications</li>
        </ul>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at:<br />
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
