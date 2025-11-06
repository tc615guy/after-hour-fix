/**
 * Calendar Settings Page
 * Manage calendar sync connections, mappings, and ICS feeds
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, RefreshCw, Plus, Copy, Trash2, ExternalLink, ArrowLeft } from 'lucide-react'

export default function CalendarSettingsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [icsFeeds, setIcsFeeds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showIcsSubscribe, setShowIcsSubscribe] = useState(false)
  const [showCreateFeed, setShowCreateFeed] = useState(false)
  const [icsUrl, setIcsUrl] = useState('')
  const [feedName, setFeedName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      // Load connected accounts
      const accountsRes = await fetch('/api/calendar/accounts')
      if (accountsRes.ok) {
        const data = await accountsRes.json()
        setAccounts(data.accounts || [])
      }

      // Load ICS feeds
      const feedsRes = await fetch('/api/calendar/feeds')
      if (feedsRes.ok) {
        const data = await feedsRes.json()
        setIcsFeeds(data.feeds || [])
      }
    } catch (error) {
      console.error('Failed to load calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSyncNow(accountId: string) {
    try {
      setSyncing(true)
      const res = await fetch(`/api/calendar/sync/${accountId}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Sync completed: ${data.summary}`)
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      alert(`Sync failed: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleSubscribeIcs() {
    try {
      const res = await fetch('/api/sync/ics/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icsUrl, name: feedName || 'External Calendar' }),
      })
      const data = await res.json()
      if (res.ok) {
        alert('Successfully subscribed to ICS feed')
        setShowIcsSubscribe(false)
        setIcsUrl('')
        setFeedName('')
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      alert(`Failed to subscribe: ${error.message}`)
    }
  }

  async function handleCreateFeed() {
    try {
      const res = await fetch('/api/calendar/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: feedName || 'My Calendar' }),
      })
      const data = await res.json()
      if (res.ok) {
        alert('ICS feed created successfully')
        setShowCreateFeed(false)
        setFeedName('')
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      alert(`Failed to create feed: ${error.message}`)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading calendar settings...
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="space-y-4">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Settings
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="w-8 h-8" />
              Calendar Sync
            </h1>
            <p className="text-gray-600 mt-1">
              Connect external calendars and manage sync settings
            </p>
          </div>
        </div>
      </div>

      {/* Connection Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>
              Two-way sync with Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => (window.location.href = '/api/sync/google/connect')}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect Google
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Microsoft Outlook</CardTitle>
            <CardDescription>
              Two-way sync with Outlook Calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => (window.location.href = '/api/sync/microsoft/connect')}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect Outlook
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              {accounts.length} calendar{accounts.length !== 1 ? 's' : ''} connected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{account.accountEmail}</div>
                    <div className="text-sm text-gray-600">
                      {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                      {account.lastSyncedAt && (
                        <span className="ml-2">
                          • Last synced: {new Date(account.lastSyncedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncNow(account.id)}
                    disabled={syncing}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Now
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ICS Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>ICS Subscription</CardTitle>
          <CardDescription>
            Subscribe to external ICS feeds (read-only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showIcsSubscribe ? (
            <Button onClick={() => setShowIcsSubscribe(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Subscribe to ICS Feed
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="ics-url">ICS Feed URL</Label>
                <Input
                  id="ics-url"
                  type="url"
                  placeholder="https://example.com/calendar.ics"
                  value={icsUrl}
                  onChange={(e) => setIcsUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="feed-name">Name (optional)</Label>
                <Input
                  id="feed-name"
                  placeholder="External Calendar"
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubscribeIcs}>Subscribe</Button>
                <Button variant="outline" onClick={() => setShowIcsSubscribe(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Published ICS Feeds */}
      <Card>
        <CardHeader>
          <CardTitle>Published ICS Feeds</CardTitle>
          <CardDescription>
            Share your bookings with other calendar apps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!showCreateFeed && (
              <Button onClick={() => setShowCreateFeed(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create ICS Feed
              </Button>
            )}

            {showCreateFeed && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div>
                  <Label htmlFor="new-feed-name">Feed Name</Label>
                  <Input
                    id="new-feed-name"
                    placeholder="My Bookings"
                    value={feedName}
                    onChange={(e) => setFeedName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateFeed}>Create</Button>
                  <Button variant="outline" onClick={() => setShowCreateFeed(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {icsFeeds.map((feed) => (
              <div key={feed.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{feed.name}</div>
                  <Badge variant={feed.enabled ? 'default' : 'secondary'}>
                    {feed.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${window.location.origin}/api/ics/${feed.token}.ics`}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(`${window.location.origin}/api/ics/${feed.token}.ics`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>Import:</strong> Blocks time based on external calendar busy times
            </p>
            <p>
              <strong>Export:</strong> Pushes AfterHourFix bookings to external calendars
            </p>
            <p>
              <strong>ICS Feed:</strong> Subscribe in any calendar app (Apple, Google, Outlook)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

