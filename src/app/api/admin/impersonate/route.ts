import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api-guard'

const ImpersonateSchema = z.object({ userId: z.string() })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId } = ImpersonateSchema.parse(body)
    const adminUser = await requireAdmin(req)

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Log the impersonation
    await prisma.eventLog.create({
      data: {
        type: 'admin.impersonate',
        payload: {
          adminEmail: adminUser.email,
          targetEmail: targetUser.email,
          targetId: targetUser.id,
        },
      },
    })

    // In a real implementation, you'd set a special session cookie here
    // For now, we'll use a simple approach with a query parameter
    // The frontend will redirect to /dashboard?impersonate={userId}

    return NextResponse.json({
      success: true,
      message: `Impersonating ${targetUser.email}`,
      userId: targetUser.id,
      email: targetUser.email,
    })
  } catch (error: any) {
    console.error('Impersonate error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
