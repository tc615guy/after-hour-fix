import axios from 'axios'
import { enqueue } from '@/lib/queue'

const POSTMARK_API_TOKEN = process.env.POSTMARK_API_TOKEN || ''
const POSTMARK_FROM = process.env.POSTMARK_FROM || process.env.FROM_EMAIL || 'noreply@afterhourfix.com'
const POSTMARK_STREAM_TXN = process.env.POSTMARK_STREAM_TXN || undefined
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@afterhourfix.com'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  // Prefer Postmark if configured
  if (POSTMARK_API_TOKEN) {
    try {
      await axios.post(
        'https://api.postmarkapp.com/email',
        {
          From: POSTMARK_FROM,
          To: input.to,
          Subject: input.subject,
          HtmlBody: input.html,
          TextBody: input.text || input.subject,
          MessageStream: POSTMARK_STREAM_TXN,
        },
        { headers: { 'X-Postmark-Server-Token': POSTMARK_API_TOKEN, 'Content-Type': 'application/json' } }
      )
      return true
    } catch (error: any) {
      console.error('Postmark sendEmail error:', error.response?.data || error.message)
      // fall through to Resend or stub
    }
  }

  // Fallback to Resend if configured
  if (RESEND_API_KEY) {
    try {
      await axios.post(
        'https://api.resend.com/emails',
        { from: FROM_EMAIL, to: input.to, subject: input.subject, html: input.html, text: input.text || input.subject },
        { headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' } }
      )
      return true
    } catch (error: any) {
      console.error('Resend sendEmail error:', error.response?.data || error.message)
      return false
    }
  }

  console.log('[EMAIL STUB] Would send:', input)
  return true
}

export async function sendEmailAsync(input: SendEmailInput): Promise<void> {
  if (process.env.BULLMQ_ENABLED === 'true') {
    await enqueue('emails', 'email.send', input)
    return
  }
  // Fallback to direct send in-process
  await sendEmail(input)
}

export function buildConfirmationEmail(
  customerName: string,
  projectName: string,
  trade: string,
  slotStart: Date,
  address: string
): string {
  const formattedDate = slotStart.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = slotStart.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .details { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${projectName}</h1>
      <p>Service Confirmation</p>
    </div>
    <div class="content">
      <p>Hi ${customerName},</p>
      <p>Your ${trade} service appointment has been confirmed!</p>

      <div class="details">
        <strong>Date & Time:</strong><br>
        ${formattedDate} at ${formattedTime}

        <br><br>
        <strong>Service Address:</strong><br>
        ${address}
      </div>

      <p>Our technician will arrive at the scheduled time. If you need to reschedule, please call us as soon as possible.</p>

      <p>Thank you for choosing ${projectName}!</p>
    </div>
    <div class="footer">
      Powered by AfterHourFix
    </div>
  </div>
</body>
</html>
  `
}

export function buildWeeklyDigestEmail(
  projectName: string,
  stats: {
    calls: number
    bookings: number
    revenue: number
    minutes: number
    escalations?: number
    avgConfidence?: number
  }
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .stats { display: flex; flex-wrap: wrap; gap: 15px; padding: 20px; }
    .stat-card { flex: 1; min-width: 150px; background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #2563eb; }
    .stat-label { color: #6b7280; font-size: 14px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly ROI Report</h1>
      <p>${projectName}</p>
    </div>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${stats.calls}</div>
        <div class="stat-label">Calls Handled</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.bookings}</div>
        <div class="stat-label">Jobs Booked</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">$${(stats.revenue / 100).toFixed(0)}</div>
        <div class="stat-label">Est. Revenue</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Math.round(stats.minutes)}</div>
        <div class="stat-label">AI Minutes Used</div>
      </div>
      ${stats.avgConfidence ? `
      <div class="stat-card">
        <div class="stat-value" style="color: ${stats.avgConfidence >= 0.8 ? '#10b981' : stats.avgConfidence >= 0.65 ? '#f59e0b' : '#ef4444'}">${(stats.avgConfidence * 100).toFixed(0)}%</div>
        <div class="stat-label">Avg Confidence</div>
      </div>
      ` : ''}
      ${typeof stats.escalations === 'number' ? `
      <div class="stat-card">
        <div class="stat-value" style="color: ${stats.escalations === 0 ? '#10b981' : stats.escalations < 3 ? '#f59e0b' : '#ef4444'}">${stats.escalations}</div>
        <div class="stat-label">Escalations</div>
      </div>
      ` : ''}
    </div>
    <div style="padding: 20px; text-align: center;">
      <p><strong>AfterHourFix booked ${stats.bookings} jobs = $${(stats.revenue / 100).toFixed(0)} est. revenue</strong></p>
      ${stats.escalations !== undefined && stats.escalations > 0 ? `
      <p style="color: #f59e0b; font-size: 14px; margin-top: 10px;">
        ⚠️ ${stats.escalations} call${stats.escalations > 1 ? 's' : ''} ${stats.escalations > 1 ? 'were' : 'was'} escalated (low confidence). Review needed.
      </p>
      ` : ''}
      ${stats.avgConfidence && stats.avgConfidence >= 0.85 ? `
      <p style="color: #10b981; font-size: 14px; margin-top: 10px;">
        ✅ Excellent AI performance this week! Average confidence: ${(stats.avgConfidence * 100).toFixed(0)}%
      </p>
      ` : ''}
    </div>
    <div class="footer">
      Powered by AfterHourFix
    </div>
  </div>
</body>
</html>
  `
}
