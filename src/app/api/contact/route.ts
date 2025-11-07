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

    const postmarkApiKey = process.env.POSTMARK_API_KEY || process.env.POSTMARK_API_TOKEN

    if (!postmarkApiKey) {
      console.error('[Contact Form] POSTMARK_API_KEY not configured in environment')
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support@afterhourfix.com directly.' },
        { status: 503 }
      )
    }

    console.log('[Contact Form] Postmark API key found, preparing email...')

    // Send email using Postmark API
    // Use support@ as sender (verified in Postmark), set Reply-To to customer
    const emailPayload = {
      From: 'support@afterhourfix.com',
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

    console.log('[Contact Form] Sending to Postmark API...')
    const postmarkResponse = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': postmarkApiKey,
        'Accept': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    console.log('[Contact Form] Postmark response status:', postmarkResponse.status)

    if (!postmarkResponse.ok) {
      const errorData = await postmarkResponse.json().catch(() => ({}))
      console.error('[Contact Form] Postmark API error:', {
        status: postmarkResponse.status,
        statusText: postmarkResponse.statusText,
        errorData
      })
      
      // Provide specific error messages based on Postmark error codes
      if (errorData.ErrorCode === 300) {
        throw new Error('Invalid email template. Please contact support.')
      } else if (errorData.ErrorCode === 400) {
        throw new Error('Sender email not verified. Please contact support.')
      } else if (errorData.ErrorCode === 401) {
        throw new Error('Email service authentication failed. Please contact support.')
      } else {
        throw new Error(errorData.Message || 'Failed to send email. Please try again or contact support@afterhourfix.com')
      }
    }

    const postmarkData = await postmarkResponse.json()
    console.log('[Contact Form] Email sent successfully. MessageID:', postmarkData.MessageID)

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully',
    })
  } catch (error: any) {
    console.error('[Contact Form] Caught error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json(
      { error: error.message || 'Failed to send message. Please try again or contact support@afterhourfix.com directly.' },
      { status: 500 }
    )
  }
}

