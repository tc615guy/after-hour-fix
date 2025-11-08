import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const ConsentSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  phone: z.string().min(7, 'Valid phone number is required'),
  business: z.string().optional(),
  consent: z.boolean().refine((val) => val === true, {
    message: 'Consent must be given',
  }),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = ConsentSchema.parse(body)

    // Store consent in database
    await prisma.eventLog.create({
      data: {
        type: 'sms.consent.given',
        payload: {
          fullName: data.fullName,
          phone: data.phone,
          business: data.business || 'Not specified',
          timestamp: new Date().toISOString(),
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      },
    })

    // Log for monitoring
    console.log(`[SMS Consent] ${data.fullName} (${data.phone}) opted in for ${data.business || 'unspecified business'}`)

    return NextResponse.json({
      success: true,
      message: 'Consent recorded successfully',
    })
  } catch (error: any) {
    console.error('[SMS Consent] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process consent',
      },
      { status: 500 }
    )
  }
}

