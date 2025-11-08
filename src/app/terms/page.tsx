import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions | AfterHourFix',
  description: 'Program terms for AfterHourFix call handling, scheduling, and SMS message delivery services.',
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
    <div className="min-h-screen bg-gray-50">
      <header className="max-w-3xl mx-auto p-6">
        <Link href="/" className="text-2xl font-bold text-blue-600">AfterHourFix</Link>
        <h1 className="text-3xl font-bold mt-6">Terms & Conditions</h1>
        <p className="mt-2 text-gray-600">Program terms for AfterHourFix call handling, scheduling, and SMS message delivery.</p>
      </header>

      <main className="max-w-3xl mx-auto p-6 bg-white shadow-sm rounded-2xl prose prose-gray max-w-none">
        <p><strong>Effective date:</strong> November 7, 2025</p>

        <h2>1. Agreement to Terms</h2>
        <p>
          These Terms govern your access to and use of AfterHourFix services (the "Services"). By using the Services, you agree to these Terms and our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>2. Services</h2>
        <p>
          AfterHourFix provides a 24/7 virtual receptionist that answers calls, triages emergencies, books appointments, and sends transactional SMS updates on behalf of participating businesses.
        </p>

        <h2>3. Messaging Program</h2>
        <ul>
          <li>Transactional only; no promotional content.</li>
          <li>Message frequency varies by interaction; msg & data rates may apply.</li>
          <li>Reply <strong>STOP</strong> to cancel; <strong>HELP</strong> for help. For assistance, email <a href="mailto:support@afterhourfix.com">support@afterhourfix.com</a>.</li>
          <li>Carriers are not liable for delayed or undelivered messages.</li>
          <li>Consent is not a condition of purchase; however, certain service updates may be necessary to fulfill your request.</li>
        </ul>

        <h2>4. User Responsibilities</h2>
        <ul>
          <li>Provide accurate contact and service information, and keep it up to date.</li>
          <li>Do not use the Services for unlawful, harmful, or abusive purposes.</li>
          <li>Respect the privacy and rights of technicians and businesses.</li>
        </ul>

        <h2>5. Business Customers</h2>
        <p>
          Businesses using AfterHourFix remain responsible for their own service delivery, pricing, warranties, and compliance with applicable laws. AfterHourFix facilitates communications and scheduling but does not provide trade services itself.
        </p>

        <h2>6. Recordings and Monitoring</h2>
        <p>
          Where permitted by law, calls may be recorded for quality and training. Notice is provided where required. See the <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>7. Disclaimers</h2>
        <p>
          The Services are provided "as is" and "as available" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, or non‑infringement. We do not guarantee uninterrupted or error‑free operation or delivery.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, AfterHourFix and its affiliates will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenues, data, or goodwill. In all cases, our aggregate liability will not exceed $100 or the amount you paid to us for the Services in the 3 months preceding the claim, whichever is greater.
        </p>

        <h2>9. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless AfterHourFix from any claims arising out of your misuse of the Services or violation of these Terms.
        </p>

        <h2>10. Changes; Termination</h2>
        <p>
          We may modify these Terms or the Services with notice where required. We may suspend or terminate access for conduct that violates these Terms or harms the Services.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Tennessee, without regard to conflicts of law rules. Venue lies in state or federal courts located in Tennessee.
        </p>

        <h2>12. Contact</h2>
        <p>
          Questions? Email <a href="mailto:support@afterhourfix.com">support@afterhourfix.com</a>.
        </p>
      </main>

      <footer className="max-w-3xl mx-auto p-6 text-sm text-gray-500 mt-12">
        <Link href="/privacy" className="underline hover:text-gray-900">
          Privacy
        </Link>
        {' · '}
        <Link href="/opt-in" className="underline hover:text-gray-900">
          Opt‑In
        </Link>
      </footer>
    </div>
  )
}
