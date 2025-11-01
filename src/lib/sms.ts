import twilio from 'twilio'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

let twilioClient: ReturnType<typeof twilio> | null = null

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('[SMS] Twilio credentials not configured - SMS disabled')
    return null
  }

  if (!twilioClient) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  }

  return twilioClient
}

export interface SendSMSParams {
  to: string
  message: string
}

export async function sendSMS({ to, message }: SendSMSParams): Promise<boolean> {
  const client = getTwilioClient()

  if (!client) {
    console.warn('[SMS] Skipping SMS - Twilio not configured')
    return false
  }

  try {
    // Clean phone number - remove all non-digits
    let cleanPhone = to.replace(/\D/g, '')

    // Add +1 if it's a 10-digit US number
    if (cleanPhone.length === 10) {
      cleanPhone = `+1${cleanPhone}`
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      cleanPhone = `+${cleanPhone}`
    } else if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+${cleanPhone}`
    }

    console.log(`[SMS] Sending to ${cleanPhone}: ${message.substring(0, 50)}...`)

    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: cleanPhone,
    })

    console.log(`[SMS] Sent successfully - SID: ${result.sid}`)
    return true
  } catch (error: any) {
    console.error('[SMS] Failed to send:', error.message)
    return false
  }
}

export function buildBookingConfirmationSMS(
  businessName: string,
  customerName: string,
  appointmentTime: Date,
  address: string,
  notes: string
): string {
  const dateStr = appointmentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = appointmentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return `${businessName} - Booking Confirmed!

Hi ${customerName},

Your appointment is scheduled for:
${dateStr} at ${timeStr}

Service Location:
${address}

Service Details:
${notes}

We'll see you then! Reply STOP to unsubscribe.`
}
