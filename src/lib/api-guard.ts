import { NextRequest } from 'next/server'
import { getServerSession } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export type Session = {
  user: { id: string; email?: string | null }
  accessToken: string
} | null

export async function requireSession(req: NextRequest): Promise<Session> {
  const session = await getServerSession()
  if (!session) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  return session
}

export async function ensureProjectAccess(userIdOrEmail: string, projectId: string) {
  // Resolve Prisma user from either Prisma id or email from Supabase session
  let prismaUser = null as null | { id: string; role: string | null }
  if (!userIdOrEmail) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  if (userIdOrEmail.includes('@')) {
    const u = await prisma.user.findUnique({ where: { email: userIdOrEmail } })
    prismaUser = u ? { id: u.id, role: (u as any).role || null } : null
  } else {
    const u = await prisma.user.findUnique({ where: { id: userIdOrEmail } })
    prismaUser = u ? { id: u.id, role: (u as any).role || null } : null
  }
  if (!prismaUser) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, ownerId: true } })
  if (!project) {
    throw new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }
  // Admins may access any project
  if ((prismaUser.role || '').toLowerCase() === 'admin') return
  if (project.ownerId !== prismaUser.id) {
    throw new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }
}

export async function getOrCreatePrismaUserByEmail(email?: string | null, name?: string | null) {
  if (!email) throw new Error('Missing user email')
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({ data: { email, name: name || email.split('@')[0] } })
  }
  return user
}

export async function requireAdmin(req: NextRequest) {
  const session = await requireSession(req)
  const email = session!.user?.email || ''
  if (!email) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({ data: { email, name: (session!.user as any)?.user_metadata?.name || email.split('@')[0] } })
  }
  if ((user.role || '').toLowerCase() !== 'admin') {
    throw new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), { status: 403 })
  }
  return user
}

// Basic, dependency-free rate limiter
// Uses Upstash REST if configured; falls back to in-memory (best-effort for dev only)
const memoryCounters: Record<string, { count: number; resetAt: number }> = {}

export async function rateLimit(req: NextRequest, key: string, limit = 60, windowSec = 60) {
  const urlBase = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  const now = Math.floor(Date.now() / 1000)

  if (urlBase && token) {
    const encKey = encodeURIComponent(`rl:${key}`)
    // INCR
    const incrRes = await fetch(`${urlBase}/INCR/${encKey}`, { headers: { Authorization: `Bearer ${token}` } })
    const incrJson = await incrRes.json().catch(() => null)
    const count = Number(incrJson?.result ?? 0)
    if (count === 1) {
      // First hit: set expiry
      await fetch(`${urlBase}/EXPIRE/${encKey}/${windowSec}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
    if (count > limit) {
      throw new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 })
    }
    return
  }

  // In-memory fallback (non-production only)
  const bucket = memoryCounters[key]
  if (!bucket || bucket.resetAt <= now) {
    memoryCounters[key] = { count: 1, resetAt: now + windowSec }
  } else {
    bucket.count += 1
    if (bucket.count > limit) {
      throw new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 })
    }
  }
}

// Minimal Sentry wrapper that never imports the SDK (avoids build-time resolution)
export async function initSentry() {
  // no-op: Sentry config files (if package is installed) will init automatically
}

export function captureException(_err: any) {
  // no-op when Sentry not installed; Sentry (if present) will capture console errors anyway
}
