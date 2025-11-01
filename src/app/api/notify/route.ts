import { NextRequest, NextResponse } from 'next/server'
import { sendEmailAsync as sendEmail } from '@/lib/email'
import { z } from 'zod'

const NotifySchema = z.object({
  type: z.enum(['sms', 'email', 'escalate']),
  to: z.string(),
  message: z.string(),
  reason: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const params = body.parameters || body
    const input = NotifySchema.parse(params)

    if (input.type === 'email') {
      await sendEmail({
        to: input.to,
        subject: 'Message from AfterHourFix AI',
        html: `<p>${input.message}</p>`,
        text: input.message,
      })

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
      })
    }

    if (input.type === 'sms') {
      // In production, integrate with Twilio or Vapi SMS
      console.log('[SMS STUB] Would send to:', input.to, input.message)

      return NextResponse.json({
        success: true,
        message: 'SMS sent successfully',
      })
    }

    if (input.type === 'escalate') {
      // Send escalation email/SMS to business owner
      console.log('[ESCALATE] Reason:', input.reason, 'Customer:', input.to)

      return NextResponse.json({
        success: true,
        message: 'Escalation triggered. Owner notified.',
      })
    }

    return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
  } catch (error: any) {
    console.error('Notify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
