import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function getServerSession() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value

  if (!accessToken) {
    return null
  }

  // Create client with anon key to verify user token (not service role key)
  // Service role key bypasses RLS and can't properly verify user tokens
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  // Use the access token to get user info
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) {
    console.error('[getServerSession] Error getting user:', error?.message)
    return null
  }

  return {
    user: data.user,
    accessToken,
  }
}
