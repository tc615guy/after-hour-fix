import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminSession } from '@/lib/api-guard'
import { z } from 'zod'

/**
 * DELETE /api/admin/phone-numbers
 * Hard-delete phone numbers (admin only)
 */
const DeleteSchema = z.object({
  e164s: z.array(z.string().regex(/^\+1\d{10}$/)),
})

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession(req)

    const body = await req.json()
    const { e164s } = DeleteSchema.parse(body)

    const result = await prisma.phoneNumber.deleteMany({
      where: {
        e164: { in: e164s },
      },
    })

    return NextResponse.json({ 
      success: true, 
      deleted: result.count,
    })
  } catch (error: any) {
    console.error('Admin delete phone numbers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

