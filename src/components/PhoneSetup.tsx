"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import PhoneInput, { toE164 } from '@/components/PhoneInput'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  projectId: string
  agentId?: string
  aiNumber?: string
}

export default function PhoneSetup({ projectId, agentId, aiNumber }: Props) {
  const router = useRouter()
  const [forwardOpen, setForwardOpen] = useState(false)
  const [portStatus, setPortStatus] = useState<any>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [existingNumber, setExistingNumber] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectResult, setConnectResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/porting/status`)
        if (res.ok) {
          const data = await res.json()
          if (data?.status) setPortStatus(data)
        }
      } catch {}
    })()
  }, [projectId])

  const aiNumberPretty = useMemo(() => {
    if (!aiNumber) return ''
    const d = aiNumber.replace(/\D/g, '')
    if (d.length === 11 && d.startsWith('1')) return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
    if (d.length === 10) return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
    return aiNumber
  }, [aiNumber])

  const handleConnectExistingNumber = async () => {
    if (!agentId) {
      setError('Agent ID is required. Please create an AI assistant first.')
      return
    }

    const e164Number = toE164(existingNumber)
    if (!e164Number) {
      setError('Please enter a valid phone number')
      return
    }

    setConnecting(true)
    setError(null)
    setConnectResult(null)

    try {
      const res = await fetch('/api/numbers/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          agentId,
          existingPhoneNumber: e164Number,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect number')
      }

      setConnectResult(data)
      // Refresh the page to show the new number
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to connect number')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Get a New Phone Number</CardTitle>
            <CardDescription>Get a dedicated business number powered by AI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">
              Purchase a local business number through Vapi. Your AI will answer 24/7, booking jobs and handling calls automatically.
            </p>
            <p className="text-sm text-blue-700 font-medium">
              This number is fully managed — no carrier configuration needed!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connect Your Existing Number</CardTitle>
            <CardDescription>Forward your existing business number to your AI assistant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!connectResult ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="existing-number">Your Business Phone Number</Label>
                  <PhoneInput
                    id="existing-number"
                    value={existingNumber}
                    onChange={setExistingNumber}
                    placeholder="(205) 555-1234"
                  />
                  <p className="text-xs text-gray-500">
                    Enter the phone number you want customers to call. We'll set up call forwarding automatically.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleConnectExistingNumber}
                  disabled={!existingNumber || connecting || !agentId}
                  className="w-full"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up forwarding...
                    </>
                  ) : (
                    'Connect Existing Number'
                  )}
                </Button>

                {!agentId && (
                  <p className="text-xs text-amber-600">
                    Please create an AI assistant first before connecting a phone number.
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">Call Forwarding Set Up!</h4>
                      <p className="text-sm text-green-700">
                        Your AI assistant number is ready. Forward calls from your existing number to activate.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded border border-green-200 space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Your Business Number:</p>
                      <p className="font-mono text-sm font-semibold">{connectResult.existingNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Forward calls to:</p>
                      <p className="font-mono text-sm font-semibold">{connectResult.forwardingNumber?.e164}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold text-green-900">Next Steps:</p>
                    <ol className="text-sm text-green-800 list-decimal list-inside space-y-1">
                      {connectResult.forwardingInstructions?.nextSteps?.map((step: string, idx: number) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <p className="text-xs text-green-700 mt-3 font-medium">
                    {connectResult.forwardingInstructions?.note}
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setConnectResult(null)
                    setExistingNumber('')
                    setConnectOpen(false)
                  }}
                  className="w-full"
                >
                  Set Up Another Number
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Use Call Forwarding (Manual)</CardTitle>
            <CardDescription>If you already have an AI number, forward your existing number to it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700">
              Your AI number: <code className="px-1 py-0.5 bg-gray-100 rounded">{aiNumber || 'not assigned'}</code>
              {aiNumber && (
                <Button variant="outline" size="sm" className="ml-2" onClick={() => navigator.clipboard.writeText(aiNumber)}>
                  Copy
                </Button>
              )}
            </div>
            {!forwardOpen ? (
              <div className="space-y-2">
                <Button variant="outline" onClick={() => setForwardOpen(true)}>
                  Show Instructions
                </Button>
                <a href="/help/forwarding" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 text-sm">Learn more</a>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 border rounded">
                  <div className="font-semibold mb-1">After Hours Forwarding</div>
                  <p className="text-sm text-gray-700">
                    In your carrier portal, set a schedule so that <strong>outside Business Hours</strong> calls forward to your AI number {aiNumberPretty}.
                  </p>
                  <p className="text-xs text-gray-600 mt-1">During Business Hours your phone rings normally. After hours, nights, and weekends the AI answers.</p>
                </div>
                <div className="p-3 bg-gray-50 border rounded">
                  <div className="font-semibold mb-1">All Hours (No Answer → AI)</div>
                  <p className="text-sm text-gray-700">
                    Keep your phone ringing first. If you <strong>don't answer</strong> after 2–5 rings or you decline, automatically forward to your AI number {aiNumberPretty}.
                  </p>
                  <p className="text-xs text-gray-600 mt-1">This keeps personal calls intact — pick up the ones you want; let the AI handle the rest.</p>
                </div>
                <div className="p-3 bg-white border rounded">
                  <div className="font-semibold mb-1">Carrier Tips</div>
                  <ul className="text-sm text-gray-700 list-disc pl-6 space-y-1">
                    <li>VoIP/PBX (RingCentral/Nextiva/Zoom/Teams): Call Handling → Schedules → After Hours → Forward to {aiNumberPretty}.</li>
                    <li>
                      Mobile (AT&amp;T/Verizon/T‑Mobile): Many support unconditional <code>*72</code>/<code>*73</code> only. For schedules, use your carrier's app/portal or a VoIP number.
                    </li>
                  </ul>
                </div>
                <div className="text-xs text-gray-600">Need help? Click "Learn more" for detailed instructions.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
