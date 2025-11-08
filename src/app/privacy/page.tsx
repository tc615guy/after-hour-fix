import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | AfterHourFix',
  description: 'How AfterHourFix collects, uses, and protects your information. Learn about our data security practices for call recordings, SMS, and customer data.',
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
    <div className="min-h-screen bg-gray-50">
      <header className="max-w-3xl mx-auto p-6">
        <Link href="/" className="text-2xl font-bold text-blue-600">AfterHourFix</Link>
        <h1 className="text-3xl font-bold mt-6">Privacy Policy</h1>
        <p className="mt-2 text-gray-600">How AfterHourFix collects, uses, and protects your information.</p>
      </header>

      <main className="max-w-3xl mx-auto p-6 bg-white shadow-sm rounded-2xl prose prose-gray max-w-none">
        <p><strong>Effective date:</strong> November 7, 2025</p>

        <h2>Overview</h2>
        <p>
          AfterHourFix, Inc. ("AfterHourFix", "we", "us") provides call answering, scheduling, and message delivery services for trade businesses (HVAC, plumbing, electrical, and similar). This Privacy Policy describes how we collect, use, and disclose information when you interact with our website, phone services, and SMS messaging program.
        </p>

        <h2>Information We Collect</h2>
        <ul>
          <li><strong>Contact Information:</strong> name, phone number, email address, and the business you're working with.</li>
          <li><strong>Service Details:</strong> address for service, appointment preferences and history, work order details, emergency flags.</li>
          <li><strong>Communications:</strong> call metadata, call recordings where permitted by law, voicemail, SMS messages and delivery status.</li>
          <li><strong>Technical Data:</strong> device and browser information, IP address, cookies/analytics about site usage.</li>
        </ul>

        <h2>How We Use Information</h2>
        <ul>
          <li>Provide and improve our services, including answering calls, booking appointments, dispatching technicians, and sending transactional messages.</li>
          <li>Authenticate requests, prevent fraud/abuse, and ensure service quality (including QA of call recordings where lawful).</li>
          <li>Comply with legal obligations and carrier/industry requirements (e.g., TCPA/CTIA guidelines).</li>
          <li>Support customers, troubleshoot issues, and communicate about your requests.</li>
        </ul>

        <h2>When We Share Information</h2>
        <ul>
          <li><strong>With Service Providers:</strong> vendors that help us route calls, send texts, host data, or provide analytics—under confidentiality agreements.</li>
          <li><strong>With the Business You Contacted:</strong> we relay your request details, contact information, and scheduling updates to the relevant trade business.</li>
          <li><strong>For Legal Reasons:</strong> to comply with law, regulation, or valid legal request; to protect rights, safety, and security.</li>
        </ul>

        <h2>Retention</h2>
        <p>
          We keep information only as long as necessary for the purposes above and as required by law. Call recordings and message logs may be retained for quality assurance and dispute resolution for a reasonable period, then deleted or anonymized.
        </p>

        <h2>Your Choices</h2>
        <ul>
          <li><strong>SMS:</strong> Reply <strong>STOP</strong> to cancel, <strong>HELP</strong> for help. Message frequency varies. Msg & data rates may apply.</li>
          <li><strong>Recordings:</strong> Where required, you will receive notice of call recording. If you prefer not to be recorded, ask the agent for alternatives.</li>
          <li><strong>Access/Deletion:</strong> Contact <a href="mailto:support@afterhourfix.com">support@afterhourfix.com</a> to request access or deletion, subject to verification and applicable law.</li>
        </ul>

        <h2>Security</h2>
        <p>
          We use reasonable administrative, technical, and physical safeguards. However, no method of transmission or storage is 100% secure.
        </p>

        <h2>Children</h2>
        <p>
          Our services are not directed to children under 13, and we do not knowingly collect data from them.
        </p>

        <h2>International Users</h2>
        <p>
          Our services are operated in the United States. If you access from outside the U.S., you consent to processing in the U.S. subject to this Policy.
        </p>

        <h2>Changes to this Policy</h2>
        <p>
          We may update this Policy from time to time. We will revise the "Effective date" and, where appropriate, provide additional notice.
        </p>

        <h2>Contact</h2>
        <p>
          Email <a href="mailto:support@afterhourfix.com">support@afterhourfix.com</a> for privacy questions or requests.
        </p>
      </main>

      <footer className="max-w-3xl mx-auto p-6 text-sm text-gray-500 mt-12">
        <Link href="/terms" className="underline hover:text-gray-900">
          Terms
        </Link>
        {' · '}
        <Link href="/opt-in" className="underline hover:text-gray-900">
          Opt‑In
        </Link>
      </footer>
    </div>
  )
}
