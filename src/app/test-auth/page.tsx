'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestAuthPage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    addLog('Checking session...')
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      addLog(`Session error: ${error.message}`)
    } else if (data.session) {
      addLog(`Session found: ${data.session.user.email}`)
      setSession(data.session)
    } else {
      addLog('No session found')
    }
  }

  const testMagicLink = async () => {
    if (!testEmail) {
      alert('Enter an email first')
      return
    }

    setLoading(true)
    addLog(`Sending magic link to ${testEmail}...`)

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: testEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        addLog(`ERROR: ${error.message}`)
      } else {
        addLog('SUCCESS: Magic link sent!')
        addLog(`Check ${testEmail} for the link`)
      }
    } catch (e: any) {
      addLog(`EXCEPTION: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    addLog('Signing out...')
    await supabase.auth.signOut()
    setSession(null)
    addLog('Signed out')
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Auth Diagnostic Tool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Current Session:</h3>
              {session ? (
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-green-900">✅ Logged in as: {session.user.email}</p>
                  <Button onClick={signOut} variant="outline" size="sm" className="mt-2">
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-gray-600">❌ Not logged in</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Test Magic Link:</h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 border rounded px-3 py-2"
                />
                <Button onClick={testMagicLink} disabled={loading}>
                  {loading ? 'Sending...' : 'Send Magic Link'}
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Logs:</h3>
              <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500">No logs yet...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))
                )}
              </div>
              <Button onClick={() => setLogs([])} variant="outline" size="sm" className="mt-2">
                Clear Logs
              </Button>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Environment Check:</h3>
              <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm">
                <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
                <p>Supabase Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
                <p>Current Origin: {typeof window !== 'undefined' ? window.location.origin : 'SSR'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
