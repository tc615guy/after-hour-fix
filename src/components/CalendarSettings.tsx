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

  useEffect(() => {
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
            ) : (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                Calendar integration is active. Your AI assistant can now book appointments automatically.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

