'use client'

import { useEffect } from 'react'

/**
 * Client component that redirects auth tokens from homepage to callback
 * This handles cases where Supabase email links redirect to / instead of /auth/callback
 */
export default function AuthRedirect() {
  useEffect(() => {
    // Check if we have auth tokens in the URL hash
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash

      // Check for access_token in hash (magic link tokens)
      if (hash.includes('access_token=')) {
        console.log('Auth tokens detected on homepage, redirecting to /auth/callback')
        // Redirect to auth callback with the hash
        window.location.replace(`/auth/callback${hash}`)
      }
    }
  }, [])

  return null
}
