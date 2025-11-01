import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    return NextResponse.json({ isAdmin: true, user: { email: user.email, name: user.name } })
  } catch (error: any) {
    console.error('Admin check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
