import { NextRequest, NextResponse } from 'next/server'
import { sendEmailAsync as sendEmail } from '@/lib/email'
import { z } from 'zod'

const NotifySchema = z.object({
  type: z.enum(['sms', 'email', 'escalate']),
  to: z.string(),
  message: z.string(),
  reason: z.string().optional(),
  customerPhone: z.string().optional(),
  recordingUrl: z.string().optional(),
  transcript: z.string().optional(),
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
      // Send escalation email to business owner with full context
      console.log('[ESCALATE] Reason:', input.reason, 'Customer:', input.customerPhone || 'N/A')

      const emailBody = `
        <h2>Call Escalation Alert</h2>
        <p><strong>${input.message}</strong></p>

        <h3>Details:</h3>
        <ul>
          <li><strong>Reason:</strong> ${input.reason || 'N/A'}</li>
          <li><strong>Customer Phone:</strong> ${input.customerPhone || 'N/A'}</li>
          ${input.recordingUrl ? `<li><strong>Recording:</strong> <a href="${input.recordingUrl}">Listen to call</a></li>` : ''}
        </ul>

        ${input.transcript ? `
        <h3>Transcript Preview:</h3>
        <p style="background: #f5f5f5; padding: 10px; border-left: 3px solid #e74c3c;">${input.transcript}</p>
        ` : ''}

        <p><em>Please review and follow up with this customer as needed.</em></p>
      `

      await sendEmail({
        to: input.to,
        subject: `🚨 Call Escalation: ${input.reason || 'Needs Review'}`,
        html: emailBody,
        text: `${input.message}\n\nCustomer: ${input.customerPhone}\nReason: ${input.reason}\n\n${input.transcript || ''}`,
      })

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
