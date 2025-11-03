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
            Connect your Cal.com account for automated appointment booking
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
              {username ? `User: ${username}` : 'Paste API key to connect'}
            </div>

            {!connected ? (
              <div className="mt-4 space-y-4">
                {/* OAuth Option - One Click */}
                {oauthAvailable && (
                  <div className="border-b pb-4">
                    <p className="text-sm font-medium mb-2">Quick Connect</p>
                    <Button 
                      onClick={() => window.location.href = `/api/calcom/oauth/authorize?projectId=${projectId}`}
                      className="w-full"
                    >
                      Connect with Cal.com OAuth
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">One-click authorization</p>
                  </div>
                )}
                
                {/* API Key Option - Manual */}
                <div>
                  <p className="text-sm font-medium mb-2">{oauthAvailable ? 'Or use API Key' : 'Connect with API Key'}</p>
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
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                Calendar integration is active. Your AI assistant can now book appointments automatically.
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
            How to get your API key
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <ol className="list-decimal space-y-2 ml-4 text-gray-700">
              <li>Go to <a href="https://app.cal.com" target="_blank" className="text-blue-600 underline">app.cal.com</a> and sign up for an account (or sign in if you already have one)</li>
              <li>Complete your profile setup (if this is your first time)</li>
              <li>Scroll down to the bottom of the left sidebar and click on "Settings" (gear icon)</li>
              <li>In the left sidebar, scroll down to find the "Developer" section</li>
              <li>Click on "API keys" under the Developer section</li>
              <li>Click the "+ Add" button to create your first API key</li>
              <li>Name the key your business name (e.g., "Best Plumber")</li>
              <li>Toggle "Never expires" to ON (recommended)</li>
              <li>Click "Save"</li>
              <li>Click "Copy" to copy the API key to your clipboard</li>
              <li>Click "Done" to close the modal</li>
              <li>Return to this page and paste your API key in the "Cal.com API Key" field above</li>
              <li>Click "Verify" to test your key (optional but recommended)</li>
              <li>Click "Connect" to activate calendar integration</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              <strong>💡 Tip:</strong> Make sure to save your API key securely - you won't be able to view it again after closing the modal on Cal.com!
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

