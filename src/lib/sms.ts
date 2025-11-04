import twilio from 'twilio'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

let twilioClient: ReturnType<typeof twilio> | null = null

export function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('[Twilio] Credentials not configured')
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

export interface TwilioAvailableNumber {
  phoneNumber: string
  friendlyName: string
  isoCountry: string
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
}

/**
 * Search for available Twilio phone numbers
 */
export async function searchAvailableNumbers(areaCode?: string, country: string = 'US'): Promise<TwilioAvailableNumber[]> {
  const client = getTwilioClient()
  if (!client) {
    throw new Error('Twilio credentials not configured')
  }

  try {
    const areaCodeNum = areaCode ? parseInt(areaCode, 10) : undefined
    const numbers = await client.availablePhoneNumbers(country)
      .local
      .list({ areaCode: areaCodeNum, limit: 20 })

    return numbers.map((num: any) => ({
      phoneNumber: num.phoneNumber,
      friendlyName: num.friendlyName,
      isoCountry: num.isoCountry,
      capabilities: num.capabilities,
    }))
  } catch (error: any) {
    console.error('[Twilio] Search error:', error.message)
    throw new Error(`Failed to search numbers: ${error.message}`)
  }
}

/**
 * Purchase a Twilio phone number
 */
export async function purchaseTwilioNumber(phoneNumber: string): Promise<string> {
  const client = getTwilioClient()
  if (!client) {
    throw new Error('Twilio credentials not configured')
  }

  try {
    const purchased = await client.incomingPhoneNumbers.create({ phoneNumber })
    console.log(`[Twilio] Purchased number: ${phoneNumber}, SID: ${purchased.sid}`)
    return purchased.sid // Return the SID for reference
  } catch (error: any) {
    console.error('[Twilio] Purchase error:', error.message)
    throw new Error(`Failed to purchase number: ${error.message}`)
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
