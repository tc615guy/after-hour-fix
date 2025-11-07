import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    console.log('[Contact Form] Received request')
    const { name, email, company, message } = await req.json()
    console.log('[Contact Form] Parsed data:', { name, email, company, messageLength: message?.length })

    if (!name || !email || !message) {
      console.error('[Contact Form] Missing required fields')
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      console.error('[Contact Form] RESEND_API_KEY not configured in environment')
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support@afterhourfix.com directly.' },
        { status: 503 }
      )
    }

    const toAddress = process.env.CONTACT_FORM_TO_EMAIL || 'support@afterhourfix.com'
    const forwardList = toAddress.split(',').map((addr) => addr.trim()).filter(Boolean)

    if (forwardList.length === 0) {
      console.error('[Contact Form] CONTACT_FORM_TO_EMAIL produced no valid recipients')
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support@afterhourfix.com directly.' },
        { status: 503 }
      )
    }

    console.log('[Contact Form] Resend API key found, preparing email...', { to: forwardList })

    const subject = `Contact Form: ${name}${company ? ` - ${company}` : ''}`
    const textBody = `
New contact form submission from AfterHourFix website:

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}

Message:
${message}

---
Reply directly to this email to respond to ${name}.
    `.trim()

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb; margin-bottom: 20px;">New Contact Form Submission</h2>
    
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563eb;">${email}</a></p>
      <p style="margin: 5px 0;"><strong>Company:</strong> ${company || 'Not provided'}</p>
    </div>
    
    <div style="background: #fff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #111827;">Message:</h3>
      <p style="white-space: pre-wrap;">${message}</p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    
    <p style="color: #6b7280; font-size: 14px;">
      Reply directly to this email to respond to ${name}.
    </p>
  </div>
</body>
</html>
    `.trim()

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'AfterHourFix Support <support@afterhourfix.com>',
        to: forwardList,
        reply_to: email,
        subject,
        html: htmlBody,
        text: textBody,
      }),
    })

    console.log('[Contact Form] Resend response status:', resendResponse.status)

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json().catch(() => ({}))
      console.error('[Contact Form] Resend API error:', {
        status: resendResponse.status,
        statusText: resendResponse.statusText,
        errorData,
      })

      const messageDetail = errorData?.message || errorData?.error || 'Failed to send email. Please try again or contact support@afterhourfix.com'
      throw new Error(messageDetail)
    }

    const resendData = await resendResponse.json().catch(() => ({}))
    console.log('[Contact Form] Email sent successfully via Resend:', resendData?.id || 'no-id')

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully',
    })
  } catch (error: any) {
    console.error('[Contact Form] Caught error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      { error: error.message || 'Failed to send message. Please try again or contact support@afterhourfix.com directly.' },
      { status: 500 }
    )
  }
}

