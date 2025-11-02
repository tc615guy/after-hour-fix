import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminSession } from '@/lib/api-guard'
import { createVapiClient } from '@/lib/vapi'
import { z } from 'zod'

/**
 * DELETE /api/admin/phone-numbers
 * Hard-delete phone numbers from both DB and Vapi (admin only)
 */
const DeleteSchema = z.object({
  e164s: z.array(z.string().regex(/^\+1\d{10}$/)),
})

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession(req)

    const body = await req.json()
    const { e164s } = DeleteSchema.parse(body)

    // First, get the numbers with their Vapi IDs
    const numbers = await prisma.phoneNumber.findMany({
      where: {
        e164: { in: e164s },
      },
    })

    // Delete from Vapi for each number
    const vapiClient = createVapiClient()
    for (const num of numbers) {
      try {
        await vapiClient.deletePhoneNumber(num.vapiNumberId)
        console.log(`[Admin Delete] Deleted from Vapi: ${num.e164}`)
      } catch (error: any) {
        console.error(`[Admin Delete] Failed to delete ${num.e164} from Vapi:`, error.message)
        // Continue with DB deletion even if Vapi fails
      }
    }

    // Then delete from database
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

