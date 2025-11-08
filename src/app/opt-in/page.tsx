'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useState } from 'react'

export default function OptInPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    business: '',
    consent: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.consent) {
      setError('You must agree to receive SMS messages')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/sms/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to submit consent')
      }

      setSuccess(true)
      setFormData({ fullName: '', phone: '', business: '', consent: false })
    } catch (err) {
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="max-w-3xl mx-auto p-6">
        <Link href="/" className="text-2xl font-bold text-blue-600">AfterHourFix</Link>
        <h1 className="text-3xl font-bold mt-6">SMS Opt‑In</h1>
        <p className="mt-2 text-gray-600">
          Consent to receive service alerts, appointment updates, and emergency technician notifications from AfterHourFix on behalf of participating trade businesses.
        </p>
      </header>

      <main className="max-w-3xl mx-auto p-6 bg-white shadow-sm rounded-2xl">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What you're signing up for</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Transactional messages only (no marketing or promotions).</li>
            <li>Examples: appointment confirmations/changes, ETA updates, emergency dispatch alerts, service follow‑ups.</li>
            <li>Message frequency varies by interaction.</li>
            <li>Message & data rates may apply.</li>
            <li>Reply <span className="font-semibold">STOP</span> to cancel at any time; reply <span className="font-semibold">HELP</span> for help.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Provide Consent</h2>
          <p className="mt-2 text-gray-700">
            By submitting this form, you agree to receive SMS communications related to your service requests. This consent is not a condition of purchase.
          </p>

          {success ? (
            <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
              <div className="text-green-600 text-2xl mb-2">✓</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Consent Received!</h3>
              <p className="text-gray-700">You're all set to receive service updates via SMS.</p>
              <Button 
                onClick={() => setSuccess(false)} 
                variant="outline" 
                className="mt-4"
              >
                Submit Another Form
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full name
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  placeholder="Jane Doe"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile number
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  placeholder="(555) 555‑5555"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label htmlFor="business" className="block text-sm font-medium text-gray-700 mb-1">
                  Business you're working with
                </label>
                <Input
                  id="business"
                  name="business"
                  value={formData.business}
                  onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                  placeholder="e.g., Big Al's HVAC"
                  className="rounded-xl"
                />
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 border border-gray-200">
                <Checkbox
                  id="consent"
                  checked={formData.consent}
                  onCheckedChange={(checked) => setFormData({ ...formData, consent: checked as boolean })}
                  required
                  className="mt-1"
                />
                <label htmlFor="consent" className="text-sm text-gray-800 cursor-pointer">
                  I agree to receive transactional SMS messages (appointment updates and service alerts) from AfterHourFix on behalf of the business named above. Message frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help. See{' '}
                  <Link href="/terms" className="underline" target="_blank" rel="noopener">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="underline" target="_blank" rel="noopener">
                    Privacy
                  </Link>
                  .
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-gray-900 hover:bg-black"
              >
                {submitting ? 'Submitting...' : 'Agree & Submit'}
              </Button>
            </form>
          )}
        </section>

        <section className="mt-10 text-sm text-gray-600 space-y-2">
          <p><span className="font-medium">Program name:</span> AfterHourFix Alerts</p>
          <p><span className="font-medium">Supported commands:</span> STOP, HELP</p>
          <p>
            <span className="font-medium">Contact:</span>{' '}
            <a className="underline hover:text-gray-900" href="mailto:support@afterhourfix.com">
              support@afterhourfix.com
            </a>
          </p>
          <p className="mt-2">
            For wireless carrier terms, standard carrier terms apply. Carriers are not liable for delayed or undelivered messages.
          </p>
          <p className="mt-2">Effective date: November 7, 2025</p>
        </section>
      </main>

      <footer className="max-w-3xl mx-auto p-6 text-sm text-gray-500">
        <Link href="/terms" className="underline hover:text-gray-900">
          Terms
        </Link>
        {' · '}
        <Link href="/privacy" className="underline hover:text-gray-900">
          Privacy
        </Link>
      </footer>
    </div>
  )
}

