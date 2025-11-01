'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  Mail,
  Briefcase,
  TrendingUp,
  PlayCircle,
  FileText,
  StickyNote,
  Save
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Call {
  id: string
  vapiCallId: string | null
  fromNumber: string
  toNumber: string
  status: string
  durationSec: number | null
  intent: string | null
  createdAt: string
  transcript: string | null
  recordingUrl: string | null
}

interface Booking {
  id: string
  customerName: string | null
  customerPhone: string | null
  slotStart: string | null
  status: string
  priceCents: number | null
  isEmergency: boolean
  createdAt: string
}

interface CustomerDetail {
  id: string
  projectId: string
  name: string
  email: string
  trade: string
  plan: string
  createdAt: string
  totalCalls: number
  totalBookings: number
  callAnswerRate: number
  bookingConversionRate: number
  estimatedRevenue: number
  aiMinutesUsed: number
  minutesLeft: number
  minutesCap: number
  adminNotes: string | null
  calls: Call[]
  bookings: Booking[]
}

export default function CustomerDetailPage() {
  const params = useParams()
  const projectId = params.id as string // This is the project ID

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [portDocs, setPortDocs] = useState<Array<{ id: string; type: string; createdAt: string; meta: any; url: string | null }>>([])
  const [zipping, setZipping] = useState(false)

  useEffect(() => {
    // Get admin email from localStorage or query param
    const urlParams = new URLSearchParams(window.location.search)
    const emailFromUrl = urlParams.get('email')
    const emailFromStorage = localStorage.getItem('adminEmail')
    const email = emailFromUrl || emailFromStorage || ''

    if (email) {
      setAdminEmail(email)
      if (emailFromUrl) {
        localStorage.setItem('adminEmail', email)
      }
      loadCustomerDetail(email)
      // Preload porting documents for this project
      ;(async () => {
        try {
          const res = await fetch(`/api/admin/projects/${projectId}/porting/docs`)
          if (res.ok) {
            const data = await res.json()
            setPortDocs(data.docs || [])
          }
        } catch {}
      })()
    } else {
      // Redirect to admin login
      window.location.href = '/admin'
    }
  }, [projectId])

  const loadCustomerDetail = async (email: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/customer/${projectId}?email=${encodeURIComponent(email)}`)
      if (!res.ok) throw new Error('Failed to load customer')

      const data = await res.json()
      setCustomer(data.customer)
      setNotes(data.customer.adminNotes || '')
    } catch (error) {
      console.error('Failed to load customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveNotes = async () => {
    if (!customer) return

    try {
      setSavingNotes(true)
      const res = await fetch(`/api/admin/customer/${projectId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, adminEmail }),
      })

      if (!res.ok) throw new Error('Failed to save notes')

      alert('Notes saved successfully!')
      await loadCustomerDetail(adminEmail)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer details...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Customer Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin">
              <Button>Back to Admin Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const successfulBookings = customer.calls.filter(call => {
    return customer.bookings.some(booking =>
      booking.createdAt && call.createdAt &&
      Math.abs(new Date(booking.createdAt).getTime() - new Date(call.createdAt).getTime()) < 300000 // 5 min window
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              <p className="text-sm text-gray-500">{customer.email}</p>
            </div>
            <Link href={`/projects/${customer.projectId}/settings`}>
              <Button>View Settings</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Customer Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Briefcase className="w-4 h-4 text-gray-500" />
                <Badge variant="outline" className="capitalize">{customer.trade}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Trade</div>
              <div className="text-xl font-bold mt-1 capitalize">{customer.trade}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <Badge variant={customer.plan === 'Pro' ? 'default' : 'secondary'}>
                  {customer.plan}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Plan</div>
              <div className="text-xl font-bold mt-1">${customer.plan === 'Pro' ? '299' : '149'}/mo</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Phone className="w-4 h-4 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Total Calls</div>
              <div className="text-xl font-bold mt-1">{customer.totalCalls}</div>
              <div className="text-xs text-gray-500 mt-1">
                {customer.callAnswerRate.toFixed(1)}% answer rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Calendar className="w-4 h-4 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Total Bookings</div>
              <div className="text-xl font-bold mt-1">{customer.totalBookings}</div>
              <div className="text-xs text-green-600 mt-1">
                {customer.bookingConversionRate.toFixed(1)}% conversion
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Clock className="w-4 h-4 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Minutes Left</div>
              <div className={`text-xl font-bold mt-1 ${customer.minutesLeft <= customer.minutesCap * 0.1 ? 'text-red-600' : ''}`}>
                {customer.minutesLeft}/{customer.minutesCap}
              </div>
              <div className="text-xs text-gray-500 mt-1">Used: {customer.aiMinutesUsed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Notes */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-600" />
              <CardTitle>Admin Notes</CardTitle>
            </div>
            <CardDescription>
              Internal notes for customer management (not visible to customer)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="admin-notes">Notes</Label>
              <Textarea
                id="admin-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about onboarding, support issues, billing, or anything relevant..."
                rows={6}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {customer.adminNotes ? 'Previously saved' : 'No notes yet'}
              </p>
            </div>
            <Button onClick={saveNotes} disabled={savingNotes}>
              <Save className="w-4 h-4 mr-2" />
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </CardContent>
        </Card>

        {/* Tabs for Calls and Bookings */}
        <Tabs defaultValue="calls" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calls">Call Logs ({customer.calls.length})</TabsTrigger>
            <TabsTrigger value="bookings">Bookings ({customer.bookings.length})</TabsTrigger>
            <TabsTrigger value="successful">Successful Bookings ({successfulBookings.length})</TabsTrigger>
            <TabsTrigger value="porting">Porting Docs ({portDocs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="calls">
            <Card>
              <CardHeader>
                <CardTitle>Call Logs</CardTitle>
                <CardDescription>All calls with transcripts and recordings</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Intent</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Recording</TableHead>
                      <TableHead>Transcript</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.calls.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No calls yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      customer.calls.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell className="text-sm">
                            {new Date(call.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {call.fromNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={call.status === 'completed' ? 'default' : 'secondary'}
                              className={call.status === 'completed' ? 'bg-green-600' : ''}
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
                            {call.durationSec ? `${Math.floor(call.durationSec / 60)}:${(call.durationSec % 60).toString().padStart(2, '0')}` : '-'}
                          </TableCell>
                          <TableCell>
                            {call.recordingUrl ? (
                              <a href={call.recordingUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="ghost">
                                  <PlayCircle className="w-4 h-4" />
                                </Button>
                              </a>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {call.transcript ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  alert(call.transcript)
                                }}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>Customer appointments and scheduling history</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Appointment Time</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No bookings yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      customer.bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="text-sm">
                            {new Date(booking.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>{booking.customerName || 'N/A'}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {booking.customerPhone || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {booking.slotStart
                              ? new Date(booking.slotStart).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {booking.priceCents
                              ? `$${(booking.priceCents / 100).toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {booking.isEmergency && (
                              <Badge variant="destructive">Emergency</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={booking.status === 'booked' ? 'default' : 'secondary'}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="successful">
            <Card>
              <CardHeader>
                <CardTitle>Successfully Booked Calls</CardTitle>
                <CardDescription>
                  Calls that resulted in appointments (for AI training analysis)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Intent</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Booking Value</TableHead>
                      <TableHead>Recording</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {successfulBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No successful bookings yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      successfulBookings.map((call) => {
                        const booking = customer.bookings.find(b =>
                          b.createdAt && call.createdAt &&
                          Math.abs(new Date(b.createdAt).getTime() - new Date(call.createdAt).getTime()) < 300000
                        )
                        return (
                          <TableRow key={call.id} className="bg-green-50">
                            <TableCell className="text-sm">
                              {new Date(call.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {call.fromNumber}
                            </TableCell>
                            <TableCell>
                              {call.intent && (
                                <Badge variant="outline">{call.intent}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {call.durationSec ? `${Math.floor(call.durationSec / 60)}:${(call.durationSec % 60).toString().padStart(2, '0')}` : '-'}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {booking?.priceCents
                                ? `$${(booking.priceCents / 100).toFixed(2)}`
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {call.recordingUrl ? (
                                <a href={call.recordingUrl} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="default" className="bg-green-600">
                                    <PlayCircle className="w-4 h-4 mr-2" />
                                    Listen
                                  </Button>
                                </a>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="porting">
            <Card>
              <CardHeader>
                <CardTitle>Porting Documents</CardTitle>
                <CardDescription>Bills and signed LOAs stored securely in Supabase</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/admin/projects/${projectId}/porting/docs`)
                        if (res.ok) {
                          const data = await res.json()
                          setPortDocs(data.docs || [])
                        } else {
                          alert('Failed to refresh docs')
                        }
                      } catch (e: any) {
                        alert(e.message)
                      }
                    }}
                  >
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        setZipping(true)
                        // Lazy-load JSZip from CDN in browser
                        if (!(window as any).JSZip) {
                          await new Promise<void>((resolve, reject) => {
                            const s = document.createElement('script')
                            s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
                            s.onload = () => resolve()
                            s.onerror = () => reject(new Error('Failed to load JSZip'))
                            document.head.appendChild(s)
                          })
                        }
                        const JSZip = (window as any).JSZip
                        const zip = new JSZip()
                        const now = new Date()
                        const folder = zip.folder(`porting-docs-${now.toISOString().slice(0,10)}`)
                        const docs = portDocs.length ? portDocs : ((await (await fetch(`/api/admin/projects/${projectId}/porting/docs`)).json()).docs || [])
                        for (const d of docs) {
                          if (!d.url) continue
                          const resp = await fetch(d.url)
                          const buf = await resp.arrayBuffer()
                          const ts = new Date(d.createdAt).toISOString().replace(/[:.]/g, '-')
                          const base = d.type === 'porting.loa_signed' ? `LOA-${ts}.html` : (d.meta?.originalName || `Bill-${ts}`)
                          folder.file(base, buf)
                        }
                        const blob = await zip.generateAsync({ type: 'blob' })
                        const link = document.createElement('a')
                        link.href = URL.createObjectURL(blob)
                        link.download = `porting-docs-${now.getTime()}.zip`
                        document.body.appendChild(link)
                        link.click()
                        link.remove()
                      } catch (e: any) {
                        alert(e.message || 'Failed to build ZIP')
                      } finally {
                        setZipping(false)
                      }
                    }}
                    disabled={zipping || (portDocs.length === 0)}
                  >
                    {zipping ? 'Preparing ZIP…' : 'Download All (ZIP)'}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portDocs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">No documents</TableCell>
                      </TableRow>
                    ) : (
                      portDocs.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-sm">{new Date(d.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={d.type === 'porting.loa_signed' ? 'default' : 'secondary'}>
                              {d.type === 'porting.loa_signed' ? 'LOA' : 'Bill'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {d.type === 'porting.loa_signed'
                              ? `Signed by ${d.meta?.fullName || 'Unknown'}`
                              : (d.meta?.originalName || 'Uploaded bill')}
                          </TableCell>
                          <TableCell>
                            {d.url ? (
                              <a href={d.url} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="ghost">
                                  <FileText className="w-4 h-4 mr-1" /> View
                                </Button>
                              </a>
                            ) : (
                              <span className="text-gray-400 text-sm">Unavailable</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
