'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, CalendarDays, PlugZap, CheckCircle, RefreshCw, Upload as UploadIcon, Download as DownloadIcon } from 'lucide-react'

interface Props {
  projectId: string
  plan?: 'starter' | 'pro'
}

export default function SchedulingIntegrations({ projectId, plan = 'starter' }: Props) {
  const [loading, setLoading] = useState(false)
  const [calApiKey, setCalApiKey] = useState('')
  const [connected, setConnected] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [eventTypeId, setEventTypeId] = useState<number | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [rangeStart, setRangeStart] = useState<string>('')
  const [rangeEnd, setRangeEnd] = useState<string>('')
  const [preset, setPreset] = useState<string>('')

  const fmt = (d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const applyPreset = (name: string) => {
    setPreset(name)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let start = ''
    let end = ''

    if (name === 'today') {
      start = fmt(today)
      end = fmt(today)
    } else if (name === 'this_week') {
      const dow = today.getDay() // 0=Sun
      const startDate = new Date(today)
      startDate.setDate(today.getDate() - dow) // Sunday
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      start = fmt(startDate)
      end = fmt(endDate)
    } else if (name === 'this_weekend') {
      const dow = today.getDay() // 0=Sun ... 6=Sat
      const sat = new Date(today)
      // days until Saturday in current week (may be 0 if already Sat)
      const daysToSat = (6 - dow + 7) % 7
      sat.setDate(today.getDate() + daysToSat)
      const sun = new Date(sat)
      sun.setDate(sat.getDate() + 1)
      start = fmt(sat)
      end = fmt(sun)
    } else if (name === 'next_weekend') {
      const dow = today.getDay()
      const sat = new Date(today)
      const daysToSat = (6 - dow + 7) % 7
      sat.setDate(today.getDate() + daysToSat + 7) // next week's Saturday
      const sun = new Date(sat)
      sun.setDate(sat.getDate() + 1)
      start = fmt(sat)
      end = fmt(sun)
    } else if (name === 'next_7') {
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 7)
      start = fmt(today)
      end = fmt(endDate)
    } else if (name === 'next_30') {
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 30)
      start = fmt(today)
      end = fmt(endDate)
    } else if (name === 'this_month') {
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      start = fmt(startDate)
      end = fmt(endDate)
    } else if (name === 'next_month') {
      const startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)
      start = fmt(startDate)
      end = fmt(endDate)
    } else if (name === 'clear') {
      setRangeStart('')
      setRangeEnd('')
      setPreset('')
      return
    }

    setRangeStart(start)
    setRangeEnd(end)
  }

  useEffect(() => {
    // Load minimal connection status from project
    const load = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        if (!res.ok) return
        const { project } = await res.json()
        setConnected(Boolean(project.calcomApiKey || project.calcomAccessToken))
        setUsername(project.calcomUser || null)
        setEventTypeId(project.calcomEventTypeId || null)
      } catch {}
    }
    load()
  }, [projectId])

  const verifyKey = async () => {
    try {
      setVerifying(true)
      const res = await fetch('/api/calcom/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: calApiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      alert(`Verified as ${data.user?.username} (TZ: ${data.user?.timeZone})`)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setVerifying(false)
    }
  }

  const connectKey = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/calcom/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, apiKey: calApiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connect failed')
      setConnected(true)
      setUsername(data.calcomUser?.username || null)
      setEventTypeId(data.eventType?.id || null)
      alert('Connected! Event type created and saved.')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const importCalendar = async () => {
    try {
      const res = await fetch('/api/scheduling/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'calcom', projectId, start: rangeStart || undefined, end: rangeEnd || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      alert(data.message || 'Imported upcoming events')
    } catch (e: any) {
      alert(e.message)
    }
  }

  const exportBookings = async () => {
    try {
      const res = await fetch('/api/scheduling/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'calcom', projectId, start: rangeStart || undefined, end: rangeEnd || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Export failed')
      alert(data.message || 'Exported recent bookings')
    } catch (e: any) {
      alert(e.message)
    }
  }

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const importCsv = async () => {
    if (!csvFile) return alert('Choose a CSV file first')
    try {
      const fd = new FormData()
      fd.append('projectId', projectId)
      fd.append('file', csvFile)
      const res = await fetch('/api/scheduling/import-csv', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'CSV import failed')
      alert(`Imported ${data.created} events from CSV`)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const exportCsv = () => {
    let url = `/api/scheduling/export-csv?projectId=${encodeURIComponent(projectId)}`
    if (rangeStart) url += `&start=${encodeURIComponent(rangeStart)}`
    if (rangeEnd) url += `&end=${encodeURIComponent(rangeEnd)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="w-5 h-5" /> Scheduling Providers
          </CardTitle>
          <CardDescription>
            Plug-and-play calendar sync. Use your existing system or Cal.com.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date range filter */
          <div className="border rounded-lg p-4">
            <div className="font-semibold mb-2">Date Range (optional)</div>
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <Label className="text-xs">Start</Label>
                <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm" />
              </div>
              <div>
                <Label className="text-xs">End</Label>
                <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm" />
              </div>
              <Button variant={preset === 'today' ? 'default' : 'outline'} size="sm" onClick={() => applyPreset('today')}>Today</Button>
              <Button variant={preset === 'this_week' ? 'default' : 'outline'} size="sm" onClick={() => applyPreset('this_week')}>This Week</Button>
              <Button variant={preset === 'this_weekend' ? 'default' : 'outline'} size="sm" onClick={() => applyPreset('this_weekend')}>This Weekend</Button>
              <Button variant={preset === 'next_weekend' ? 'default' : 'outline'} size="sm" onClick={() => applyPreset('next_weekend')}>Next Weekend</Button>
              <Button variant={preset === 'next_7' ? 'default' : 'outline'} size="sm" onClick={() => applyPreset('next_7')}>Next 7 Days</Button>
              <Button variant={preset === 'next_30' ? 'default' : 'outline'} size="sm" onClick={() => applyPreset('next_30')}>Next 30 Days</Button>
              <Button variant={preset === 'this_month' ? 'default' : 'outline'} size="sm" onClick={() => applyPreset('this_month')}>This Month</Button>
              <Button variant={preset === 'next_month' ? 'default' : 'outline'} size="sm" onClick={() => applyPreset('next_month')}>Next Month</Button>
              <Button variant="ghost" size="sm" onClick={() => applyPreset('clear')}>Clear</Button>
            </div>
            <div className="text-xs text-gray-500 mt-2">Applies to provider import/export and CSV export. Leave blank for defaults.</div>
          </div>

          {/* Universal CSV import/export (Google Calendar compatible) */}
          <div className="border rounded-lg p-4">
            <div className="font-semibold mb-2">Universal CSV</div>
            <p className="text-sm text-gray-600 mb-3">Import or export calendar using Google Calendar compatible CSV.</p>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              <Button variant="outline" onClick={importCsv}>
                <UploadIcon className="w-4 h-4 mr-2" /> Import CSV
              </Button>
              <Button variant="outline" onClick={exportCsv}>
                <DownloadIcon className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              CSV columns: Subject, Start Date, Start Time, End Date, End Time, All Day Event, Description, Location, Private
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Cal.com</div>
                {connected ? (
                  <Badge variant="default" className="bg-green-600">Connected</Badge>
                ) : (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {username ? `User: ${username}` : 'Paste API key to connect'}
              </div>

              {plan !== 'pro' ? (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                  Provider connections are available on Pro. Use CSV import/export above, or upgrade to enable direct sync.
                </div>
              ) : !connected ? (
                <div className="mt-4 space-y-3">
                  <Label htmlFor="calkey">Cal.com API Key</Label>
                  <Input
                    id="calkey"
                    type="password"
                    placeholder="cal_live_xxxxx"
                    value={calApiKey}
                    onChange={(e) => setCalApiKey(e.target.value)}
                    className="font-mono"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={verifyKey} disabled={!calApiKey || verifying}>
                      {verifying ? 'Verifying...' : 'Verify'}
                    </Button>
                    <Button onClick={connectKey} disabled={!calApiKey || loading}>
                      {loading ? 'Connecting...' : 'Connect'}
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href="https://app.cal.com/settings/developer/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Get Key <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              ) : null}

              {plan === 'pro' && connected && (
                <div className="mt-4 space-y-3">
                  {eventTypeId && (
                    <div className="text-xs text-gray-600">Event Type ID: <span className="font-mono">{eventTypeId}</span></div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={importCalendar} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" /> Import Calendar
                    </Button>
                    <Button onClick={exportBookings} variant="outline">
                      <CalendarDays className="w-4 h-4 mr-2" /> Export Bookings
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">Imports upcoming events, exports your recent bookings.</div>
                </div>
              )}
            </div>

            {[
              { name: 'Google Calendar', status: 'Coming Soon' },
              { name: 'Outlook / Microsoft 365', status: 'Coming Soon' },
              { name: 'ServiceTitan', status: 'Coming Soon' },
              { name: 'Housecall Pro', status: 'Coming Soon' },
              { name: 'Jobber', status: 'Coming Soon' },
              { name: 'Calendly', status: 'Coming Soon' },
            ].map((p) => (
              <div key={p.name} className="border rounded-lg p-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.name}</div>
                  <Badge variant="secondary">{p.status}</Badge>
                </div>
                <div className="text-sm text-gray-600 mt-1">Import/export events with one click.</div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" disabled>
                    Connect
                  </Button>
                  <Button variant="outline" disabled>
                    Import
                  </Button>
                  <Button variant="outline" disabled>
                    Export
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span>
                Simple defaults: during your business hours calls forward to you; after-hours the AI answers and books.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
