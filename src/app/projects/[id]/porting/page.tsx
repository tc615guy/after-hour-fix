"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function PortingWizardPage() {
  const params = useParams()
  const projectId = params.id as string

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<any>(null)

  const [numberToPort, setNumberToPort] = useState('')
  const [carrier, setCarrier] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountPin, setAccountPin] = useState('')

  const [businessName, setBusinessName] = useState('')
  const [serviceAddress, setServiceAddress] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const [loaFullName, setLoaFullName] = useState('')
  const [loaAgree, setLoaAgree] = useState(false)
  const [billFile, setBillFile] = useState<File | null>(null)
  const [showLoaPreview, setShowLoaPreview] = useState(false)

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/porting/status`)
        if (res.ok) setStatus(await res.json())
      } catch {}
    }, 5000)
    return () => clearInterval(timer)
  }, [projectId])

  const submitPortRequest = async () => {
    try {
      if (!numberToPort || !carrier || !businessName || !contactName || !contactEmail) {
        alert('Complete required fields')
        return
      }
      setSubmitting(true)
      const res = await fetch(`/api/projects/${projectId}/porting/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: numberToPort,
          carrier,
          businessName,
          serviceAddress,
          billingAddress,
          contact: { name: contactName, email: contactEmail, phone: contactPhone },
          account: { number: accountNumber, pin: accountPin },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setStatus(data)
      setStep(3)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const uploadBill = async () => {
    if (!billFile) return alert('Choose a file')
    const fd = new FormData()
    fd.append('file', billFile)
    const res = await fetch(`/api/projects/${projectId}/porting/upload-bill`, { method: 'POST', body: fd })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Upload failed')
      return
    }
    alert('Bill uploaded')
  }

  const submitLoa = async () => {
    if (!loaFullName || !loaAgree) return alert('Please sign the LOA')
    const res = await fetch(`/api/projects/${projectId}/porting/loa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: loaFullName, agreedAt: new Date().toISOString() }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'LOA failed')
      return
    }
    alert('LOA signed')
    setStep(4)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/projects/${projectId}/settings`} className="text-blue-600 hover:underline">← Back to Settings</Link>
          <div className="text-sm text-gray-600">Porting Wizard</div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Port Your Business Number</CardTitle>
            <CardDescription>During Business Hours we forward to your phone; outside hours the AI answers automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className={`flex-1 h-2 rounded ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-sm">
                    <span className="block mb-1">Phone number to port*</span>
                    <Input value={numberToPort} onChange={(e) => setNumberToPort(e.target.value)} placeholder="+1 555 123 4567" />
                  </label>
                  <label className="text-sm">
                    <span className="block mb-1">Current carrier*</span>
                    <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="AT&T, Verizon, etc." />
                  </label>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-sm">
                    <span className="block mb-1">Account number</span>
                    <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                  </label>
                  <label className="text-sm">
                    <span className="block mb-1">Account PIN / CSR (if required)</span>
                    <Input value={accountPin} onChange={(e) => setAccountPin(e.target.value)} />
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setStep(2)}>Next</Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-sm">
                    <span className="block mb-1">Business legal name*</span>
                    <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                  </label>
                  <label className="text-sm">
                    <span className="block mb-1">Service address</span>
                    <Input value={serviceAddress} onChange={(e) => setServiceAddress(e.target.value)} />
                  </label>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-sm">
                    <span className="block mb-1">Billing address</span>
                    <Input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
                  </label>
                  <div />
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <label className="text-sm">
                    <span className="block mb-1">Authorized contact name*</span>
                    <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                  </label>
                  <label className="text-sm">
                    <span className="block mb-1">Contact email*</span>
                    <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                  </label>
                  <label className="text-sm">
                    <span className="block mb-1">Contact phone</span>
                    <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={submitPortRequest} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Port Request'}</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 border rounded">
                  <div className="font-semibold mb-1">Upload last phone bill</div>
                  <input type="file" accept="application/pdf,image/*" onChange={(e) => setBillFile(e.target.files?.[0] || null)} />
                  <div className="text-xs text-gray-600 mt-1">PDF or image accepted</div>
                  <div className="mt-2"><Button onClick={uploadBill} variant="outline">Upload Bill</Button></div>
                </div>
                <div className="p-3 bg-gray-50 border rounded">
                  <div className="font-semibold mb-1">Letter of Authorization</div>
                  <p className="text-sm text-gray-700">By signing, you authorize AfterHourFix to port the above number from your current carrier.</p>
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowLoaPreview((s) => !s)}>
                      {showLoaPreview ? 'Hide LOA Preview' : 'Preview LOA'}
                    </Button>
                  </div>
                  {showLoaPreview && (
                    <div className="mt-3 border rounded bg-white p-3 text-xs text-gray-800 space-y-2 max-h-64 overflow-auto">
                      <div className="font-semibold text-sm">Letter of Authorization (Preview)</div>
                      <p>Business: <strong>{businessName || '(enter business name in Step 2)'}</strong></p>
                      <p>Number to Port: <strong>{numberToPort || '(enter number in Step 1)'}</strong></p>
                      <p>Current Carrier: <strong>{carrier || '(enter carrier in Step 1)'}</strong></p>
                      <p>Service Address: <strong>{serviceAddress || '(optional)'}</strong></p>
                      <p>Authorized Contact: <strong>{contactName || '(enter in Step 2)'}</strong> ({contactEmail || 'email required'})</p>
                      <hr />
                      <p>
                        I, {loaFullName || '________________'}, authorize AfterHourFix and its carrier partners to act as my agent
                        for the purpose of porting the above telephone number(s) from the listed carrier. I confirm that I have
                        the authority to make this change and that the information provided is accurate.
                      </p>
                      <p>Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-3 mt-2">
                    <label className="text-sm">
                      <span className="block mb-1">Full name (signature)</span>
                      <Input value={loaFullName} onChange={(e) => setLoaFullName(e.target.value)} />
                    </label>
                    <label className="text-sm flex items-end gap-2">
                      <input type="checkbox" checked={loaAgree} onChange={(e) => setLoaAgree(e.target.checked)} />
                      <span>I agree and sign</span>
                    </label>
                  </div>
                  <div className="mt-2"><Button onClick={submitLoa}>Sign LOA</Button></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={() => setStep(4)}>Next</Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border-blue-200 border rounded text-sm">
                  <div className="font-semibold mb-1">Status</div>
                  <div>Status: {status?.status || 'submitted'}</div>
                  {status?.focDate && <div>FOC Date: {new Date(status.focDate).toLocaleString()}</div>}
                </div>
                <p className="text-sm text-gray-700">We’ll notify you when your number is ready. After completion, use “Sync from Vapi” in Settings → Numbers to attach the ported number.</p>
                <Link href={`/projects/${projectId}/settings`}>
                  <Button>Done</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
