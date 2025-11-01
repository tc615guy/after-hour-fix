import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET() {
  try {
    // Get the access token from cookies
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Create Supabase client with the access token
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(accessToken)

    if (error || !supabaseUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get or create user in Prisma
    let user = await prisma.user.findUnique({
      where: { id: supabaseUser.id }
    })

    if (!user) {
      // Create user in Prisma if doesn't exist
      user = await prisma.user.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
          role: 'user'
        }
      })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (e: any) {
    console.error('Auth /me error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
