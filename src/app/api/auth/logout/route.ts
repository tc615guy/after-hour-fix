import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST() {
  try {
    // Get the access token from cookies
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value

    if (accessToken) {
      // Create Supabase client and sign out
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      await supabase.auth.signOut()
    }

    // Clear cookies
    const response = NextResponse.json({ success: true })
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    
    return response
  } catch (error: any) {
    console.error('[/api/auth/logout] Error:', error)
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
  }
}

// Also support GET for compatibility
export async function GET() {
  return POST()
}

