'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ExternalLink, CalendarDays, AlertTriangle } from 'lucide-react'

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
  const [checking, setChecking] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'valid' | 'invalid' | null>(null)
  const [showReconnectDialog, setShowReconnectDialog] = useState(false)
  
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
      setConnectionStatus('valid')
      alert('Connected! Event type created and saved.')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const checkConnection = async () => {
    try {
      setChecking(true)
      setConnectionStatus(null)
      const res = await fetch(`/api/calcom/check-connection?projectId=${projectId}`)
      const data = await res.json()
      
      if (data.valid) {
        setConnectionStatus('valid')
        alert(`✅ Connection is active!\n\nUser: ${data.username}\nEvent Type: ${data.eventTypeName || 'Created'}`)
      } else {
        setConnectionStatus('invalid')
        setShowReconnectDialog(true)
      }
    } catch (e: any) {
      setConnectionStatus('invalid')
      setShowReconnectDialog(true)
    } finally {
      setChecking(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Cal.com? You will need to reconnect to enable booking.')) return
    
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calcomApiKey: null,
          calcomAccessToken: null,
          calcomRefreshToken: null,
          calcomTokenExpiry: null,
          calcomEventTypeId: null,
          calcomUserId: null,
          calcomUser: null,
          calcomConnectedAt: null,
        }),
      })
      if (!res.ok) throw new Error('Failed to disconnect')
      setConnected(false)
      setUsername(null)
      setConnectionStatus(null)
      alert('Disconnected successfully')
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
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={checkConnection} 
                    disabled={checking}
                    className="flex-1"
                  >
                    {checking ? 'Checking...' : 'Check Connection'}
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDisconnect}
                    disabled={loading}
                  >
                    Disconnect
                  </Button>
                </div>
                {connectionStatus === 'valid' && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                    ✅ Connection verified successfully!
                  </div>
                )}
                {connectionStatus === 'invalid' && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                    ❌ Connection failed. Please reconnect below.
                  </div>
                )}
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

      {/* Reconnect Dialog */}
      <Dialog open={showReconnectDialog} onOpenChange={setShowReconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Connection Failed
            </DialogTitle>
            <DialogDescription>
              Your Cal.com connection is no longer valid. This could be because:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <ul className="list-disc ml-4 space-y-1 text-gray-700">
              <li>Your API key was deleted or regenerated in Cal.com</li>
              <li>Your Cal.com account credentials changed</li>
              <li>The event type was deleted</li>
              <li>Your Cal.com account is no longer active</li>
            </ul>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <strong>⚠️ Important:</strong> Your AI assistant cannot book appointments until you reconnect.
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowReconnectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={() => {
                setShowReconnectDialog(false)
                handleDisconnect()
              }}
            >
              Disconnect & Reconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

