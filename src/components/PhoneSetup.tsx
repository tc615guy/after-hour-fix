"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  projectId: string
  aiNumber?: string
}

export default function PhoneSetup({ projectId, aiNumber }: Props) {
  const [forwardOpen, setForwardOpen] = useState(false)
  const [portStatus, setPortStatus] = useState<any>(null)

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

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Port Phone To AfterHourFix</CardTitle>
            <CardDescription>One place to manage hours, forwarding, and your AI — no carrier juggling.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">Moves your public business number to AfterHourFix. During Business Hours we forward to your phone; outside hours the AI answers automatically.</p>
            {portStatus && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <div className="font-semibold mb-1">Port Status</div>
                <div>Status: {portStatus.status}</div>
                {portStatus.focDate && <div>FOC Date: {new Date(portStatus.focDate).toLocaleString()}</div>}
              </div>
            )}
            <Button asChild>
              <Link href={`/projects/${projectId}/porting`} target="_blank" rel="noopener noreferrer">
                {portStatus ? 'View Porting' : 'Start Port'}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conditional Forwarding</CardTitle>
            <CardDescription>Keep your current number; forward to your AI after hours or only if you don’t answer.</CardDescription>
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
                  <div className="font-semibold mb-1">Option A — After Hours Only</div>
                  <p className="text-sm text-gray-700">
                    In your carrier portal, set a schedule so that <strong>outside Business Hours</strong> calls forward to your AI number {aiNumberPretty}.
                  </p>
                  <p className="text-xs text-gray-600 mt-1">During Business Hours your phone rings normally. After hours, nights, and weekends the AI answers.</p>
                </div>
                <div className="p-3 bg-gray-50 border rounded">
                  <div className="font-semibold mb-1">Option B — All Hours (No Answer → AI)</div>
                  <p className="text-sm text-gray-700">
                    Keep your phone ringing first. If you <strong>don’t answer</strong> after 2–5 rings or you decline, automatically forward to your AI number {aiNumberPretty}.
                  </p>
                  <p className="text-xs text-gray-600 mt-1">This keeps personal calls intact — pick up the ones you want; let the AI handle the rest.</p>
                </div>
                <div className="p-3 bg-white border rounded">
                  <div className="font-semibold mb-1">Carrier Tips</div>
                  <ul className="text-sm text-gray-700 list-disc pl-6 space-y-1">
                    <li>VoIP/PBX (RingCentral/Nextiva/Zoom/Teams): Call Handling → Schedules → After Hours → Forward to {aiNumberPretty}.</li>
                    <li>
                      Mobile (AT&amp;T/Verizon/T‑Mobile): Many support unconditional <code>*72</code>/<code>*73</code> only. For schedules, use your carrier’s app/portal or a VoIP number.
                    </li>
                  </ul>
                </div>
                <div className="text-xs text-gray-600">Need help? Click “Send me these steps” and we’ll email the instructions.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
