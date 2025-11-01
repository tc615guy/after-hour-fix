'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Users,
  Phone,
  Calendar,
  TrendingUp,
  DollarSign,
  Search,
  ExternalLink,
  LogIn,
  AlertCircle
} from 'lucide-react'

interface CustomerMetrics {
  id: string // project ID
  userId: string // user ID for impersonation
  name: string
  email: string
  trade: string
  plan: string
  createdAt: string

  // Metrics
  totalCalls: number
  answeredCalls: number
  callAnswerRate: number

  totalBookings: number
  bookingConversionRate: number

  aiMinutesUsed: number
  minutesLeft: number
  minutesCap: number
  estimatedRevenue: number

  lastCallDate: string | null
  status: 'active' | 'churned'
}

interface AdminStats {
  totalCustomers: number
  activeCustomers: number
  churnedCustomers: number
  totalCalls: number
  totalBookings: number
  avgConversionRate: number
  totalRevenue: number
  mrr: number
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [customers, setCustomers] = useState<CustomerMetrics[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const allSelected = Object.keys(selected).length > 0 && Object.values(selected).every(Boolean)

  const loadAdminData = async () => {
    try {
      setLoading(true)
      setLoginError('')

      // Check admin status via session
      const authRes = await fetch(`/api/admin/check`)
      if (!authRes.ok) {
        const data = await authRes.json()
        setLoginError(data.error || 'Access denied')
        setIsAdmin(false)
        setLoading(false)
        return
      }
      setIsAdmin(true)

      // Load stats and customers
      const [statsRes, customersRes] = await Promise.all([
        fetch(`/api/admin/stats`),
        fetch(`/api/admin/customers`),
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }

      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers(data.customers)
      }
    } catch (error) {
      console.error('Failed to load admin data:', error)
      setLoginError('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAdminData() }, [])

  const handleImpersonate = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) throw new Error('Failed to impersonate user')

      // Redirect to dashboard as that user
      window.location.href = '/dashboard'
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.trade.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              Enter your admin email to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginError && (
              <div className="flex items-center gap-2 text-red-600 text-sm mb-3">
                <AlertCircle className="w-4 h-4" />
                {loginError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <Link href="/auth/login">
                <Button className="w-full">Sign in</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-purple-100 mt-1">AfterHourFix Platform Analytics</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" className="bg-white text-purple-600 hover:bg-purple-50">
                Exit Admin Mode
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.activeCustomers || 0} active • {stats?.churnedCustomers || 0} churned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCalls || 0}</div>
              <p className="text-xs text-gray-500 mt-1">
                Across all customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
              <p className="text-xs text-green-600 mt-1">
                {stats?.avgConversionRate?.toFixed(1) || 0}% avg conversion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${((stats?.mrr || 0) / 100).toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">
                ${((stats?.totalRevenue || 0) / 100).toLocaleString()} total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Customer List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Customer Metrics</CardTitle>
                <CardDescription>
                  View performance metrics and manage customer accounts
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {isAdmin && customers.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-600">Bulk actions on selected projects</div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const next: Record<string, boolean> = {}
                        const ids = filteredCustomers.map((c) => c.id)
                        ids.forEach((id) => (next[id] = true))
                        setSelected(next)
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
                        if (!ids.length) return alert('No projects selected')
                        if (!window.confirm('Enable membership for selected projects?')) return
                        const res = await fetch('/api/admin/projects/membership/bulk', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ids, membershipActive: true }),
                        })
                        if (!res.ok) alert('Bulk enable failed')
                      }}
                    >
                      Enable Membership
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
                        if (!ids.length) return alert('No projects selected')
                        if (!window.confirm('Disable membership for selected projects?')) return
                        const res = await fetch('/api/admin/projects/membership/bulk', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ids, membershipActive: false }),
                        })
                        if (!res.ok) alert('Bulk disable failed')
                      }}
                    >
                      Disable Membership
                    </Button>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => {
                          const next: Record<string, boolean> = {}
                          if (e.target.checked) filteredCustomers.forEach((c) => (next[c.id] = true))
                          setSelected(next)
                        }}
                      />
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Minutes Left</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Answer Rate</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Est. Revenue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={Boolean(selected[customer.id])}
                            onChange={(e) => setSelected({ ...selected, [customer.id]: e.target.checked })}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-gray-500">{customer.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {customer.trade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={customer.plan === 'Pro' ? 'default' : 'secondary'}>
                            {customer.plan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={customer.minutesLeft <= customer.minutesCap * 0.1 ? 'text-red-600 font-semibold' : ''}>
                            {customer.minutesLeft}/{customer.minutesCap}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{customer.totalCalls}</TableCell>
                        <TableCell className="text-right">
                          <span className={customer.callAnswerRate >= 90 ? 'text-green-600 font-semibold' : ''}>
                            {customer.callAnswerRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{customer.totalBookings}</TableCell>
                        <TableCell className="text-right">
                          <span className={customer.bookingConversionRate >= 30 ? 'text-green-600 font-semibold' : ''}>
                            {customer.bookingConversionRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          ${(customer.estimatedRevenue / 100).toFixed(0)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={customer.status === 'active' ? 'default' : 'destructive'}
                            className={customer.status === 'active' ? 'bg-green-600' : ''}
                          >
                            {customer.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImpersonate(customer.userId)}
                              title="Login as customer"
                            >
                              <LogIn className="w-4 h-4" />
                            </Button>
                            <Link href={`/admin/customer/${customer.id}`}>
                              <Button size="sm" variant="ghost" title="View details">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

