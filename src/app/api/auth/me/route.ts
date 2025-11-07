import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Free access emails (don't need to pay)
const FREE_ACCESS_EMAILS = [
  'josh.lanius@gmail.com',
  'joshlanius@yahoo.com',
  'thundercatcrypto@gmail.com',
]

// Admin emails
const ADMIN_EMAILS = [
  'josh.lanius@gmail.com',
  'joshlanius@yahoo.com',
]

export async function GET() {
  try {
    // Get the access token from cookies
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value

    console.log('[/api/auth/me] Access token present:', !!accessToken)

    if (!accessToken) {
      console.log('[/api/auth/me] No access token found in cookies')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Create Supabase client with the access token
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(accessToken)

    console.log('[/api/auth/me] Supabase user:', supabaseUser ? supabaseUser.email : 'none', 'error:', error?.message || 'none')

    if (error || !supabaseUser) {
      console.log('[/api/auth/me] Invalid Supabase session')
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const normalizedEmail = supabaseUser.email?.toLowerCase().trim()

    // Get or create user in Prisma
    // First try to find by Supabase ID
    let user = await prisma.user.findUnique({
      where: { id: supabaseUser.id }
    })

    console.log('[/api/auth/me] User lookup by ID:', user ? 'found' : 'not found')

    // If not found by ID, try to find by email
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: supabaseUser.email! }
      })
      console.log('[/api/auth/me] User lookup by email:', user ? 'found' : 'not found')

      if (user) {
        // User exists with different ID - update the ID to match Supabase
        console.log('[/api/auth/me] Updating user ID from', user.id, 'to', supabaseUser.id)
        user = await prisma.user.update({
          where: { email: supabaseUser.email! },
          data: { id: supabaseUser.id }
        })
        console.log('[/api/auth/me] User ID updated successfully')
      } else {
        // User doesn't exist at all - create new
        console.log('[/api/auth/me] Creating new user in Prisma:', supabaseUser.email)
        
        // Determine role and payment status
        const isAdmin = ADMIN_EMAILS.includes(normalizedEmail!)
        const hasFreeAccess = FREE_ACCESS_EMAILS.includes(normalizedEmail!)
        const role = isAdmin ? 'admin' : 'user'
        
        user = await prisma.user.create({
          data: {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
            role: role,
            setupFee: hasFreeAccess ? 'paid' : 'unpaid' // Free access users marked as paid
          }
        })
        console.log('[/api/auth/me] User created:', user.id, 'Role:', role, 'SetupFee:', user.setupFee)
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        setupFee: user.setupFee
      }
    })
  } catch (e: any) {
    console.error('[/api/auth/me] Error:', e)
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
