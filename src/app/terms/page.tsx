import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b sticky top-0 bg-white z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">AfterHourFix</Link>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      <article className="container mx-auto px-4 py-20 max-w-3xl prose prose-blue">
        <h1>Terms of Service</h1>
        <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>

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
          <li>14-day free trial available for new customers</li>
          <li>Pricing is subject to change with 30 days notice</li>
          <li>Additional AI minutes beyond your plan are charged at $0.10/minute</li>
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
          Phone: 844-607-5052<br />
          Email: support@afterhourfix.com
        </p>
      </article>
    </div>
  )
}
