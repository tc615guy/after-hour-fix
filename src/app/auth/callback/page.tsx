"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`
  } catch {}
}

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'processing' | 'ok' | 'error'>('processing')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    let aborted = false
    async function run() {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code') || ''
        const tokenHash = url.searchParams.get('token_hash') || ''
        const type = (url.searchParams.get('type') || 'magiclink') as any
        const email = url.searchParams.get('email') || ''

        console.log('Auth callback - code:', code ? 'present' : 'missing')
        console.log('Auth callback - hash:', url.hash)

        let session = null as any
        let err: any = null

        if (code) {
          console.log('Exchanging code for session...')
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          session = data?.session
          err = error
          console.log('Exchange result - session:', session ? 'success' : 'failed', 'error:', err?.message || 'none')
        } else if (tokenHash && email) {
          console.log('Verifying OTP...')
          const { data, error } = await (supabase.auth as any).verifyOtp({ type, token_hash: tokenHash, email })
          session = data?.session
          err = error
        } else {
          // Final fallback: direct tokens (query or hash) -> setSession
          const allParams = new URLSearchParams(url.search)
          if (url.hash && url.hash.startsWith('#')) {
            const hashParams = new URLSearchParams(url.hash.substring(1))
            hashParams.forEach((v, k) => allParams.set(k, v))
          }
          const access_token = allParams.get('access_token')
          const refresh_token = allParams.get('refresh_token')
          if (access_token && refresh_token) {
            console.log('Setting session from tokens...')
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
            session = data?.session
            err = error
          } else {
            console.error('No valid auth params found - code:', !!code, 'tokenHash:', !!tokenHash, 'tokens:', !!access_token)
            throw new Error('Missing auth parameters in callback URL')
          }
        }

        if (err) throw new Error(err.message)
        if (session?.access_token) {
          const now = Math.floor(Date.now() / 1000)
          const exp = typeof session.expires_at === 'number' ? session.expires_at : now + 60 * 60
          const maxAge = Math.max(60, exp - now)
          setCookie('sb-access-token', session.access_token, maxAge)
          if (session.refresh_token) setCookie('sb-refresh-token', session.refresh_token, 60 * 60 * 24 * 14)
        }
        if (!aborted) {
          setStatus('ok')

          // Check if user has any projects - if not, send to onboarding
          let redirectTo = url.searchParams.get('redirect')
          if (!redirectTo) {
            try {
              // Wait a bit for cookies to be set
              await new Promise(resolve => setTimeout(resolve, 100))

              const res = await fetch('/api/projects', {
                credentials: 'include'
              })

              if (res.ok) {
                const data = await res.json()
                // If user has no projects, send them to onboarding
                redirectTo = (data.projects && data.projects.length > 0) ? '/dashboard' : '/onboarding'
              } else {
                // If API fails, assume new user and send to onboarding
                redirectTo = '/onboarding'
              }
            } catch (e) {
              console.error('Project check error:', e)
              // On error, assume new user and send to onboarding
              redirectTo = '/onboarding'
            }
          }

          window.location.replace(redirectTo)
        }
      } catch (e: any) {
        if (!aborted) {
          setStatus('error')
          setMessage(e?.message || 'Failed to complete sign-in')
        }
      }
    }
    run()
    return () => { aborted = true }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <h1 className="text-xl font-semibold mb-2">Signing you in…</h1>
            <p className="text-gray-600">Completing authentication, please wait.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold mb-2">Sign-in Error</h1>
            <p className="text-red-600 mb-4">{message}</p>
            <Link className="text-blue-600 underline" href="/auth/login">Back to login</Link>
          </>
        )}
      </div>
    </div>
  )
}
