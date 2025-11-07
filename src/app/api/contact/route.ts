import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    const postmarkApiKey = process.env.POSTMARK_API_KEY

    if (!postmarkApiKey) {
      console.error('[Contact Form] POSTMARK_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured. Please try again later.' },
        { status: 500 }
      )
    }

    // Send email using Postmark API
    // Use noreply@ as sender (must be verified in Postmark), set Reply-To to customer
    const emailPayload = {
      From: 'noreply@afterhourfix.com',
      To: 'support@afterhourfix.com',
      ReplyTo: email,
      Subject: `Contact Form: ${name}${company ? ` - ${company}` : ''}`,
      TextBody: `
New contact form submission from AfterHourFix website:

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}

Message:
${message}

---
Reply directly to this email to respond to ${name}.
      `.trim(),
      HtmlBody: `
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
      `.trim(),
    }

    const postmarkResponse = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': postmarkApiKey,
        'Accept': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!postmarkResponse.ok) {
      const errorData = await postmarkResponse.json().catch(() => ({}))
      console.error('[Contact Form] Postmark API error:', errorData)
      throw new Error('Failed to send email')
    }

    const postmarkData = await postmarkResponse.json()
    console.log('[Contact Form] Email sent successfully:', postmarkData.MessageID)

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully',
    })
  } catch (error: any) {
    console.error('[Contact Form] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}

