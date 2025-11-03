'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Phone, Calendar as CalendarIcon, DollarSign, Clock, Settings, LogOut, List, Download, Upload, Shield } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import MobileNav from '@/components/MobileNav'
import { formatCurrency, formatDuration, formatPhoneNumber } from '@/lib/utils'
import CalendarView from '@/components/CalendarView'
import FirstTimePopup from '@/components/FirstTimePopup'
import MissedOpportunityCalculator from '@/components/MissedOpportunityCalculator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [calls, setCalls] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [stats, setStats] = useState({
    callsToday: 0,
    bookingsWeek: 0,
    minutesUsed: 0,
    estRevenue: 0,
    minutesCap: 0,
    allowOverage: false,
    membershipActive: true,
  })
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [csvPreview, setCsvPreview] = useState<null | { headers: string[]; rows: string[][] }>(null)
  const [csvMapping, setCsvMapping] = useState({
    name: '',
    phone: '',
    email: '',
    datetime: '',
    date: '',
    startTime: '',
    endTime: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    appointmentId: '',
    jobNumber: '',
    status: '',
    value: '',
    campaignSource: '',
    technician: '',
    technicianId: '',
    notes: '',
  })
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResults, setCsvResults] = useState<null | { created: number; errors: { index: number; error: string }[] }>(null)
  const [rangeFrom, setRangeFrom] = useState<string>('')
  const [rangeTo, setRangeTo] = useState<string>('')
  const [exportSource, setExportSource] = useState<'all' | 'ahf'>('all')
  const [purchasingNumber, setPurchasingNumber] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject.id)
    }
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
      if (data.projects?.length > 0) {
        setSelectedProject(data.projects[0])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProjectData = async (projectId: string) => {
    try {
      const [callsRes, bookingsRes, statsRes, subRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/calls`),
        fetch(`/api/projects/${projectId}/bookings`),
        fetch(`/api/projects/${projectId}/stats`),
        fetch(`/api/projects/${projectId}/subscription`),
      ])

      if (callsRes.ok) {
        const callsData = await callsRes.json()
        setCalls(callsData.calls || [])
      }

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json()
        setBookings(bookingsData.bookings || [])
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats || stats)
      }

      if (subRes.ok) {
        const subData = await subRes.json()
        setSubscription(subData.subscription || null)
      }
    } catch (error) {
      console.error('Failed to load project data:', error)
    }
  }

  const refreshSelectedProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedProject(data.project)
      }
    } catch (e) {
      console.error('Failed to refresh project:', (e as any)?.message)
    }
  }

  const handleExportCSV = async () => {
    if (!selectedProject) return
    const params = new URLSearchParams({ projectId: selectedProject.id })
    if (rangeFrom) params.set('start', new Date(rangeFrom).toISOString())
    if (rangeTo) params.set('end', new Date(rangeTo).toISOString())
    if (exportSource === 'ahf') params.set('source', 'ahf')
    const res = await fetch(`/api/scheduling/export-csv?${params.toString()}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(`Export failed: ${data.error || res.statusText}`)
      return
    }
    const text = await res.text()
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `calendar_${selectedProject.name}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportServiceTitanCSV = async () => {
    if (!selectedProject) return
    const params = new URLSearchParams({ projectId: selectedProject.id, format: 'servicetitan' })
    if (rangeFrom) params.set('start', new Date(rangeFrom).toISOString())
    if (rangeTo) params.set('end', new Date(rangeTo).toISOString())
    if (exportSource === 'ahf') params.set('source', 'ahf')
    const res = await fetch(`/api/scheduling/export-csv?${params.toString()}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(`Export failed: ${data.error || res.statusText}`)
      return
    }
    const text = await res.text()
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `servicetitan_${selectedProject.name}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImportCSVPreview = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = String(e.target?.result || '')
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
        if (lines.length === 0) throw new Error('Empty CSV')
        const headers = (lines[0].match(/(\".*?\"|[^,]+)(?=\s*,|\s*$)/g) || []).map(h => h.trim().replace(/^\"|\"$/g, ''))
        const rows: string[][] = []
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].match(/(\".*?\"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.trim().replace(/^\"|\"$/g, '')) || []
          if (cols.length > 0) rows.push(cols)
        }
        setCsvPreview({ headers, rows })
        const lower = headers.map(h => h.toLowerCase())
        const find = (...candidates: string[]) => {
          for (const c of candidates) {
            const i = lower.findIndex(h => h.includes(c))
            if (i >= 0) return headers[i]
          }
          return ''
        }
        setCsvMapping({
          name: find('customername','customer name','name','customer','client name','client','contact name','contact'),
          phone: find('customerphone','customer phone','phone','mobile','cell','phone number','contact phone','primary phone','tel','telephone'),
          email: find('customeremail','customer email','email','e-mail','contact email','email address'),
          datetime: find('appointment date/time','appointment datetime','appointmentdatetime','date/time','datetime','scheduled','scheduled date','appointment time'),
          date: find('appointmentdate','appointment date','start date','date','job date','service date','appt date'),
          startTime: find('starttimelocal','start time','starttime','time','appointment time','scheduled time','begin time'),
          endTime: find('endtimelocal','end time','endtime','finish time','completion time'),
          street: find('serviceaddress','service address','address','street','address 1','address1','location','job address','site address','property address'),
          city: find('city','servicecity','service city'),
          state: find('state','province','servicestate','service state'),
          zip: find('zip','zipcode','postal','postalcode','postal code','service zip'),
          appointmentId: find('appointmentid','appointment id','apptid','appt id','id','booking id','confirmation number','reference'),
          jobNumber: find('jobnumber','job number','job no','job #','work order','workorder','wo number','invoice number','invoice'),
          status: find('status','appointment status','job status','state','booking status'),
          value: find('value','amount','price','total','cost','job total','invoice total','grand total','subtotal'),
          campaignSource: find('campaignsource','campaign source','source','lead source','referral source','marketing source','utm source','origin'),
          technician: find('technician','tech','tech name','technician name','assigned to','assigned tech','assigned technician','worker','employee'),
          technicianId: find('technicianid','tech id','technician id','techid','tech_id','tech #','tech number','employee id','worker id'),
          notes: find('notes','memo','description','desc','comments','job description','work description','special instructions','customer notes'),
        })
      } catch (error: any) {
        alert(`Import failed: ${error.message}`)
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  function mapRowToBooking(headers: string[], row: string[]) {
    const get = (h: string) => {
      const idx = headers.indexOf(h)
      return idx >= 0 ? row[idx] : ''
    }
    const priceStr = get(csvMapping.value)
    // Determine slotStart/slotEnd
    let slotStart: string | null = null
    let slotEnd: string | null = null
    if (csvMapping.datetime) {
      slotStart = parseDateFlexible(get(csvMapping.datetime))
    } else if (csvMapping.date && csvMapping.startTime) {
      const d = get(csvMapping.date)
      const t = get(csvMapping.startTime)
      // Use ISO format T separator for better compatibility
      slotStart = parseDateFlexible(`${d}T${t}`)
    }
    if (csvMapping.date && csvMapping.endTime) {
      const d = get(csvMapping.date)
      const t = get(csvMapping.endTime)
      // Use ISO format T separator for better compatibility
      slotEnd = parseDateFlexible(`${d}T${t}`)
    }
    // Build address if components mapped
    const address = csvMapping.street ? [get(csvMapping.street), get(csvMapping.city), get(csvMapping.state), get(csvMapping.zip)].filter(Boolean).join(', ') : ''
    // Normalize status
    const rawStatus = get(csvMapping.status)
    const status = rawStatus && rawStatus.toLowerCase() === 'scheduled' ? 'booked' : (rawStatus || 'booked')
    const apptId = get(csvMapping.appointmentId)
    const jobNum = get(csvMapping.jobNumber)
    const source = get(csvMapping.campaignSource)
    // notes with tags
    const baseNotes = get(csvMapping.notes)
    const parts: string[] = []
    if (apptId) parts.push(`[APTID:${apptId}]`)
    if (jobNum) parts.push(`[JOB:${jobNum}]`)
    if (source) parts.push(`[SRC:${source}]`)
    const notesTagged = parts.length > 0 ? `${parts.join(' ')} ${baseNotes}`.trim() : baseNotes
    return {
      customerName: get(csvMapping.name) || '',
      customerPhone: get(csvMapping.phone) || '',
      customerEmail: get(csvMapping.email) || '',
      slotStart,
      slotEnd,
      address,
      status,
      priceCents: priceStr
        ? Math.round(
            parseFloat(
              priceStr
                .replace(/[^0-9.,-]/g, '')
                .replace(/,(?=\d{3}(\D|$))/g, '')
            ) * 100
          )
        : null,
      appointmentId: apptId || undefined,
      jobNumber: jobNum || undefined,
      campaignSource: source || undefined,
      technician: get(csvMapping.technician) || '',
      technicianId: get(csvMapping.technicianId) || '',
      notes: notesTagged || ''
    }
  }

  const performMappedImport = async () => {
    if (!csvPreview || !selectedProject) return
    try {
      setCsvImporting(true)
      let rows = csvPreview.rows.map(r => mapRowToBooking(csvPreview.headers, r))
      // Optional date range filter
      const from = rangeFrom ? new Date(rangeFrom) : null
      const to = rangeTo ? new Date(rangeTo) : null
      if (from || to) {
        rows = rows.filter((row) => {
          if (!row.slotStart) return false
          const d = new Date(row.slotStart)
          if (from && d < from) return false
          if (to && d > to) return false
          return true
        })
      }
      const res = await fetch(`/api/projects/${selectedProject.id}/bookings/import-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Import failed')
      }
      const errors = (data.results || []).filter((r: any) => r.status === 'error').map((r: any) => ({ index: r.index, error: r.error }))
      setCsvResults({ created: data.created || 0, errors })
      await loadProjectData(selectedProject.id)
    } catch (e: any) {
      alert(`Import failed: ${e.message}`)
    } finally {
      setCsvImporting(false)
    }
  }

  // Try to parse many common date-time formats safely to ISO
  function parseDateFlexible(input: string | undefined | null): string | null {
    if (!input) return null
    let s = String(input).trim()
    // Remove surrounding quotes
    s = s.replace(/^"|"$/g, '')

    // Handle Excel serial date numbers (e.g., 45000 = 2023-03-06)
    const numValue = parseFloat(s)
    if (!isNaN(numValue) && numValue > 25000 && numValue < 100000) {
      // Excel dates start from 1900-01-01 (serial 1)
      const excelEpoch = new Date(1899, 11, 30) // 1899-12-30
      const date = new Date(excelEpoch.getTime() + numValue * 86400000)
      if (!isNaN(date.getTime())) return date.toISOString()
    }

    // Handle Unix timestamps (seconds or milliseconds)
    if (!isNaN(numValue) && numValue > 1000000000) {
      // If > 10 digits, assume milliseconds; otherwise seconds
      const timestamp = numValue > 10000000000 ? numValue : numValue * 1000
      const date = new Date(timestamp)
      if (!isNaN(date.getTime())) return date.toISOString()
    }

    // First try native parsing
    const native = new Date(s)
    if (!isNaN(native.getTime())) return native.toISOString()

    // Handle formats like: M/D/YYYY, H:MM[:SS] AM/PM
    const commaIdx = s.indexOf(',')
    if (commaIdx > -1) {
      const left = s.slice(0, commaIdx).trim()
      const right = s.slice(commaIdx + 1).trim()
      const iso = parseMDYWithTime(left, right)
      if (iso) return iso
    }

    // Handle formats like: M/D/YYYY H:MM AM/PM (no comma)
    const mdyTime = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i)
    if (mdyTime) {
      const iso = mdyToIso(mdyTime)
      if (iso) return iso
    }

    // Handle 24-hour formats: M/D/YYYY HH:MM or M-D-YYYY HH:MM
    const mdy24 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (mdy24) {
      const [_, m, d, y, hh, mm, ss] = mdy24
      let year = Number(y)
      if (year < 100) year += 2000
      const date = new Date(year, Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss || '0'))
      if (!isNaN(date.getTime())) return date.toISOString()
    }

    // Handle formats like: YYYY-MM-DD HH:MM[:SS]
    const ymdTime = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (ymdTime) {
      const [_, y, m, d, hh, mm, ss] = ymdTime
      const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss || '0'))
      if (!isNaN(date.getTime())) return date.toISOString()
    }

    // Handle date-only formats (assume noon for consistent results)
    const dateOnly = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (dateOnly) {
      const [_, m, d, y] = dateOnly
      let year = Number(y)
      if (year < 100) year += 2000
      const date = new Date(year, Number(m) - 1, Number(d), 12, 0, 0)
      if (!isNaN(date.getTime())) return date.toISOString()
    }

    return null
  }

  function parseMDYWithTime(mdy: string, time: string): string | null {
    const mdyMatch = mdy.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (!mdyMatch) return null
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i)
    if (!timeMatch) return null
    return mdyToIso([...mdyMatch, ...timeMatch.slice(1)] as any)
  }

  function mdyToIso(match: RegExpMatchArray): string | null {
    // match can be from combined regex; pick last 7 entries as time piece if needed
    const m = Number(match[1])
    const d = Number(match[2])
    let y = Number(match[3])
    if (y < 100) y += 2000
    let hh = Number(match[4])
    const mm = Number(match[5])
    const ss = Number(match[6] || '0')
    const ampm = (match[7] || '').toUpperCase()
    if (ampm === 'PM' && hh < 12) hh += 12
    if (ampm === 'AM' && hh === 12) hh = 0
    const date = new Date(y, m - 1, d, hh, mm, ss)
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  }

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Redirect to preview mode - same handler as preview
    handleImportCSVPreview(event)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!selectedProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Projects Found</CardTitle>
            <CardDescription>Get started by creating your first project</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/onboarding">
              <Button className="w-full">Start Onboarding</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* First Time Popup */}
      {selectedProject && (
        <FirstTimePopup
          projectId={selectedProject.id}
          storageKey={`first-time-dashboard-${selectedProject.id}`}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-blue-600">AfterHourFix</h1>
              <select
                value={selectedProject.id}
                onChange={(e) => {
                  const project = projects.find((p) => p.id === e.target.value)
                  setSelectedProject(project)
                }}
                className="px-3 py-2 border rounded-md"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <div className="md:hidden">
                <MobileNav projectId={selectedProject?.id} />
              </div>
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
              <Link href={`/projects/${selectedProject.id}/settings`}>
                <Button variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Link href="/auth/logout">
                <Button variant="ghost" size="sm" className="hidden md:inline-flex">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
       {/* Plan Usage Bar */}
        {selectedProject && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Plan Usage</CardTitle>
              <CardDescription>Minutes used this billing period</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const used = stats.minutesUsed || 0
                const cap = stats.minutesCap || 0
                const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0
                const barColor = pct >= 100 ? 'bg-red-500' : pct >= 90 ? 'bg-yellow-500' : 'bg-green-600'
                return (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div>{used}/{cap} min ({pct}%)</div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-600">Allow extra usage (+$0.10/min)</div>
                        <Switch
                          checked={Boolean(stats.allowOverage)}
                          onCheckedChange={async (val) => {
                            if (!window.confirm(val ? 'Enable extra usage at $0.10/min?' : 'Disable extra usage and enforce hard cap?')) return
                            try {
                              await fetch(`/api/projects/${selectedProject.id}/overage`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ allowOverage: val }),
                              })
                              // refresh stats
                              await loadProjectData(selectedProject.id)
                            } catch (e:any) {
                              alert(e.message || 'Failed to update')
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded">
                      <div className={`h-3 ${barColor} rounded`} style={{ width: `${pct}%` }} />
                    </div>
                    {!stats.membershipActive && (
                      <div className="mt-2 text-xs text-red-700">Membership is paused for this project.</div>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        )}
       {/* KPI Cards */}
        {selectedProject?.numbers?.length === 0 && (
          <Card className="mb-6 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                No Phone Number Assigned
              </CardTitle>
              <CardDescription>
                Purchase a business number for your assistant to answer 24/7.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                disabled={purchasingNumber}
                onClick={async () => {
                  try {
                    setPurchasingNumber(true)
                    if (!selectedProject) return
                    const agents = selectedProject.agents || []
                    const activeAgent = agents.sort(
                      (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    )[0]
                    if (!activeAgent) {
                      alert('No assistant found to attach number to.')
                      return
                    }
                    const res = await fetch('/api/numbers', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ projectId: selectedProject.id, agentId: activeAgent.id }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Failed to purchase number')
                    alert(`Number purchased: ${data?.phoneNumber?.e164 || 'success'}`)
                    await refreshSelectedProject(selectedProject.id)
                  } catch (e: any) {
                    alert(`Error: ${e.message}`)
                  } finally {
                    setPurchasingNumber(false)
                  }
                }}
              >
                {purchasingNumber ? 'Purchasing...' : 'Purchase Number'}
              </Button>
            </CardContent>
          </Card>
        )}
        {selectedProject?.numbers?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                AI Assistant Phone Number
              </CardTitle>
              <CardDescription>Your main business line answered by AI 24/7.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <div className="font-mono text-lg">
                {formatPhoneNumber(selectedProject.numbers[0].e164)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(selectedProject.numbers[0].e164)}
                title="Copy number"
              >
                Copy
              </Button>
              <Link href={`/projects/${selectedProject.id}/settings`}>
                <Button variant="ghost" size="sm">Manage Numbers</Button>
              </Link>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
              <Phone className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.callsToday}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bookings This Week</CardTitle>
              <CalendarIcon className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bookingsWeek}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">AI Minutes Used</CardTitle>
              <Clock className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.minutesUsed)}</div>
              <p className="text-xs text-gray-500">This billing period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Est. Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.estRevenue)}</div>
              <p className="text-xs text-gray-500">This week</p>
            </CardContent>
          </Card>
        </div>

        {/* Missed Opportunity Calculator */}
        {selectedProject && (
          <div className="mb-8">
            <MissedOpportunityCalculator projectId={selectedProject.id} />
          </div>
        )}

        {/* Recent Calls */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Calls</CardTitle>
                <CardDescription>Latest inbound and outbound calls</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Mobile Filters Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <button id="filters-dialog-open" className="hidden" aria-hidden="true" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <label className="text-xs text-gray-600">From</label>
              <input type="date" className="border rounded px-2 py-1 text-sm" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
              <label className="text-xs text-gray-600">To</label>
              <input type="date" className="border rounded px-2 py-1 text-sm" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
              <label className="text-xs text-gray-600">Source</label>
              <select className="border rounded px-2 py-1 text-sm" value={exportSource} onChange={(e) => setExportSource(e.target.value as any)}>
                <option value="all">All jobs</option>
                <option value="ahf">AfterHourFix jobs only</option>
              </select>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile Actions Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <button id="actions-dialog-open" className="hidden" aria-hidden="true" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Actions</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <Button variant="outline" onClick={handleExportCSV}>Export CSV</Button>
              {/* Removed ServiceTitan export per request */}
              <Button variant="default" onClick={() => document.getElementById('csv-import-preview')?.click()}>Import CSV (Preview)</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Upgrade / Cap banner */}
        {selectedProject && (
          (() => {
            const proId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
            const cap = subscription && proId && subscription.priceId === proId ? 1200 : 500
            const used = stats.minutesUsed || 0
            const pct = cap > 0 ? used / cap : 0
            if (pct >= 1) {
              return (
                <div className="mb-4 p-3 rounded border-2 border-red-300 bg-red-50 text-red-800 text-sm flex items-center justify-between">
                  <span>Usage limit reached ({used}/{cap} minutes). Calls will be forwarded until you upgrade.</span>
                  <Link href="/pricing" className="underline font-semibold">Upgrade</Link>
                </div>
              )
            }
            if (pct >= 0.9) {
              return (
                <div className="mb-4 p-3 rounded border-2 border-yellow-300 bg-yellow-50 text-yellow-900 text-sm flex items-center justify-between">
                  <span>Almost out of minutes ({used}/{cap}). Prevent interruptions by upgrading.</span>
                  <Link href="/pricing" className="underline font-semibold">View Plans</Link>
                </div>
              )
            }
            return null
          })()
        )}
            {calls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No calls yet. Your AI is ready to answer!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.slice(0, 5).map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="font-mono">
                        {formatPhoneNumber(call.fromNumber)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            call.status === 'completed'
                              ? 'default'
                              : call.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {call.intent && (
                          <Badge variant="outline">{call.intent}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {call.durationSec ? formatDuration(call.durationSec) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(call.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Bookings Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bookings</CardTitle>
                <CardDescription>Upcoming and past appointments</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={bookings.length === 0}
                  title="Export bookings to CSV"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                {/* Removed ServiceTitan export per request */}
                <label htmlFor="csv-import">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    title="Import bookings from CSV"
                  >
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </span>
                  </Button>
                </label>
                <input
                  id="csv-import"
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
                <label htmlFor="csv-import-preview">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    title="Preview and map CSV columns before import"
                  >
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Import (Preview)
                    </span>
                  </Button>
                </label>
                <input
                  id="csv-import-preview"
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSVPreview}
                  className="hidden"
                />
                <div className="border-l mx-1"></div>
                <div className="hidden md:flex items-center gap-2 mr-2">
                  <label className="text-xs text-gray-600">From</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1 text-sm"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                  />
                  <label className="text-xs text-gray-600">To</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1 text-sm"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                  />
                  <label className="text-xs text-gray-600">Source</label>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={exportSource}
                    onChange={(e) => setExportSource(e.target.value as any)}
                    title="Choose jobs to export"
                  >
                    <option value="all">All jobs</option>
                    <option value="ahf">AfterHourFix jobs only</option>
                  </select>
                </div>
                <Button
                  variant={view === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('list')}
                >
                  <List className="w-4 h-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={view === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('calendar')}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Calendar
                </Button>
              </div>
              {/* Mobile actions */}
              <div className="flex md:hidden gap-2">
                <Button size="sm" variant="outline" onClick={() => document.getElementById('filters-dialog-open')?.click()}>
                  Filters
                </Button>
                <Button size="sm" variant="outline" onClick={() => document.getElementById('actions-dialog-open')?.click()}>
                  Actions
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {csvPreview && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold">CSV Preview & Mapping</div>
                    <div className="text-xs text-gray-600">Map columns, then import. First 5 rows shown.</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setCsvPreview(null); setCsvResults(null) }}>Cancel</Button>
                    <Button size="sm" onClick={performMappedImport} disabled={csvImporting}>
                      {csvImporting ? 'Importing...' : 'Import Rows'}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {[
                    { key: 'name', label: 'Customer Name' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'email', label: 'Email' },
                    { key: 'datetime', label: 'Appointment Date/Time (combined)' },
                    { key: 'date', label: 'Date (separate)' },
                    { key: 'startTime', label: 'Start Time (separate)' },
                    { key: 'endTime', label: 'End Time (separate)' },
                    { key: 'technician', label: 'Technician Name' },
                    { key: 'technicianId', label: 'Technician ID' },
                    { key: 'status', label: 'Status' },
                    { key: 'value', label: 'Value' },
                    { key: 'notes', label: 'Notes' },
                  ].map((f: any) => (
                    <label key={f.key} className="text-xs">
                      <div className="text-gray-600 mb-1">{f.label}</div>
                      <select
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={(csvMapping as any)[f.key]}
                        onChange={(e) => setCsvMapping({ ...csvMapping, [f.key]: e.target.value })}
                      >
                        <option value="">— Not mapped —</option>
                        {csvPreview.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="overflow-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr>
                        {csvPreview.headers.slice(0, 8).map((h) => (
                          <th key={h} className="text-left p-2 border-b">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-b">
                          {csvPreview.headers.slice(0, 8).map((h, j) => (
                            <td key={j} className="p-2">{r[j] || ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvResults && (
                  <div className="mt-3 text-xs">
                    <div className="font-semibold">Import result</div>
                    <div className="text-gray-700">Created: {csvResults.created} • Errors: {csvResults.errors.length}</div>
                    {csvResults.errors.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 max-h-40 overflow-auto">
                        {csvResults.errors.slice(0, 50).map((e, idx) => (
                          <li key={idx} className="text-red-700">Row {e.index + 2}: {e.error}</li>
                        ))}
                        {csvResults.errors.length > 50 && (
                          <li className="text-gray-600">…and {csvResults.errors.length - 50} more</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            {view === 'calendar' && selectedProject ? (
              <CalendarView projectId={selectedProject.id} />
            ) : bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No bookings yet. First booking coming soon!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Appointment</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.slice(0, 5).map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.customerName || 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {booking.customerPhone
                          ? formatPhoneNumber(booking.customerPhone)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {booking.slotStart
                          ? new Date(booking.slotStart).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {booking.priceCents
                          ? formatCurrency(booking.priceCents)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            booking.status === 'booked'
                              ? 'default'
                              : booking.status === 'completed'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {((booking.notes || '').includes('[IMPORTED]')) ? (
                          <span className="text-xs text-gray-400">Imported</span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!selectedProject) return
                              if (!confirm('Delete this booking?')) return
                              try {
                                const res = await fetch(`/api/projects/${selectedProject.id}/bookings/${booking.id}`, { method: 'DELETE' })
                                const data = await res.json().catch(() => ({}))
                                if (!res.ok) throw new Error(data.error || 'Failed to delete')
                                await loadProjectData(selectedProject.id)
                              } catch (e: any) {
                                alert(e.message)
                              }
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
