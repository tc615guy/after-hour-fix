import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let data: Record<string, string> = {}
    if (contentType.includes('application/json')) {
      data = await req.json()
    } else {
      const fd = await req.formData()
      data = Object.fromEntries(Array.from(fd.entries()).map(([k, v]) => [k, typeof v === 'string' ? v : (v as File)?.name || '']))
    }

    const Schema = z.object({
      businessName: z.string().min(1),
      contactName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional().default(''),
      trade: z.string().optional().default(''),
      platform: z.string().optional().default(''),
      platformOther: z.string().optional().default(''),
    })
    const parsed = Schema.parse({
      businessName: (data.businessName || '').trim(),
      contactName: (data.contactName || '').trim(),
      email: (data.email || '').trim(),
      phone: (data.phone || '').trim(),
      trade: (data.trade || '').trim(),
      platform: (data.platform || '').trim(),
      platformOther: (data.platformOther || '').trim(),
    })

    const { businessName, contactName, email, phone, trade, platform, platformOther } = parsed

    // Required fields are enforced by Zod above

    try {
      const { sendEmailAsync } = await import('@/lib/email')
      await sendEmailAsync({
        to: 'support@afterhourfix.com',
        subject: 'New Company Signup Interest',
        html: `
          <p><strong>Business:</strong> ${businessName}</p>
          <p><strong>Contact:</strong> ${contactName}</p>
          <p><strong>Trade:</strong> ${trade || '-'}</p>
          <p><strong>Phone:</strong> ${phone || '-'}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Platform:</strong> ${platform || '-'} ${platform === 'Other' && platformOther ? '('+platformOther+')' : ''}</p>
        `,
      })
    } catch (e: any) {
      console.warn('lead email failed', e?.message)
    }

    return NextResponse.redirect(new URL('/thank-you', req.url))
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to submit' }, { status: 500 })
  }
}
