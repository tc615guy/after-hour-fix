'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, CalendarDays } from 'lucide-react'

interface Props {
  projectId: string
  trade: string
  projectName: string
}

export default function CalendarSettings({ projectId }: Props) {
  const [loading, setLoading] = useState(false)
  const [calApiKey, setCalApiKey] = useState('')
  const [connected, setConnected] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [oauthAvailable, setOauthAvailable] = useState(false)
  
  useEffect(() => {
    // Check if OAuth is configured
    fetch('/api/calcom/oauth/authorize?projectId=test')
      .then((res) => res.json())
      .then((data) => {
        // If no error, OAuth is configured
        setOauthAvailable(!data.error || !data.error.includes('not configured'))
      })
      .catch(() => setOauthAvailable(false))
    
    const load = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        if (!res.ok) return
        const { project } = await res.json()
        setConnected(Boolean(project.calcomApiKey || project.calcomAccessToken))
        setUsername(project.calcomUser || null)
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
      alert('Connected! Event type created and saved.')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" /> Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect YOUR Cal.com account to allow the AI to book appointments into YOUR calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
              {username ? `Connected as: ${username}` : 'You need your own Cal.com account to connect'}
            </div>

            {!connected ? (
              <div className="mt-4 space-y-4">
                {/* Important Notice */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <strong>📅 Important:</strong> You need to create your own FREE Cal.com account first. Appointments will be booked into YOUR calendar, not ours!
                </div>

                {/* OAuth Option - One Click */}
                {oauthAvailable && (
                  <div className="border-b pb-4">
                    <p className="text-sm font-medium mb-2">Quick Connect (Recommended)</p>
                    <Button 
                      onClick={() => window.location.href = `/api/calcom/oauth/authorize?projectId=${projectId}`}
                      className="w-full"
                    >
                      Connect Your Cal.com Account
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">One-click authorization - you'll be redirected to Cal.com to sign in</p>
                  </div>
                )}
                
                {/* API Key Option - Manual */}
                <div>
                  <p className="text-sm font-medium mb-2">{oauthAvailable ? 'Or use API Key (Manual)' : 'Connect with API Key'}</p>
                  <Label htmlFor="calkey">Cal.com API Key</Label>
                  <Input
                    id="calkey"
                    type="password"
                    placeholder="cal_live_xxxxx"
                    value={calApiKey}
                    onChange={(e) => setCalApiKey(e.target.value)}
                    className="font-mono mt-1"
                  />
                  <div className="flex gap-2 mt-2">
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
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ✅ Calendar integration is active! Your AI assistant can now book appointments directly into your Cal.com calendar.
                </div>
                <div className="text-xs text-gray-600">
                  <strong>What happens now:</strong>
                  <ul className="list-disc ml-4 mt-1 space-y-1">
                    <li>Customers call your AI receptionist</li>
                    <li>AI checks YOUR real-time availability from Cal.com</li>
                    <li>AI books appointments into YOUR calendar</li>
                    <li>YOU receive booking notifications from Cal.com</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <strong>📅 Step 1: Create Your Cal.com Account (FREE)</strong>
              <p className="text-xs text-gray-700 mt-1">
                Go to <a href="https://app.cal.com" target="_blank" className="text-blue-600 underline">app.cal.com</a> and sign up for a free account. This is YOUR calendar where appointments will be booked.
              </p>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <strong>🔗 Step 2: Connect to AfterHourFix</strong>
              <p className="text-xs text-gray-700 mt-1">
                Click "Connect Your Cal.com Account" above and authorize AfterHourFix to access your calendar.
              </p>
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <strong>✅ Step 3: Done!</strong>
              <p className="text-xs text-gray-700 mt-1">
                Your AI receptionist can now book appointments into YOUR Cal.com calendar automatically!
              </p>
            </div>

            <hr className="my-4" />

            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Alternative: Manual API Key Setup (Advanced)</summary>
              <ol className="list-decimal space-y-2 ml-4 mt-3 text-gray-700">
                <li>Go to <a href="https://app.cal.com" target="_blank" className="text-blue-600 underline">app.cal.com</a> and sign in to YOUR account</li>
                <li>Click "Settings" (gear icon) in the left sidebar</li>
                <li>Find "Developer" section → Click "API keys"</li>
                <li>Click "+ Add" to create a new API key</li>
                <li>Name it after your business (e.g., "Big Turd Plumbing")</li>
                <li>Toggle "Never expires" to ON</li>
                <li>Click "Save" → Click "Copy" → Click "Done"</li>
                <li>Return here and paste your API key above</li>
                <li>Click "Verify" then "Connect"</li>
              </ol>
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <strong>⚠️ Warning:</strong> Save your API key securely - you can't view it again after closing Cal.com!
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

