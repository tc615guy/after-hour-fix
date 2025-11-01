#!/usr/bin/env tsx

/**
 * Test SMS Sending
 * Verify Twilio configuration and send a test SMS
 */

import 'dotenv/config'
import { sendSMS, buildBookingConfirmationSMS } from '../src/lib/sms'

async function main() {
  console.log('Testing SMS Configuration...\n')

  const testPhone = process.env.TEST_PHONE_NUMBER || '6156135383'

  console.log(`Sending test SMS to: ${testPhone}\n`)

  const testMessage = buildBookingConfirmationSMS(
    'JL Plumbing',
    'Test Customer',
    new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    '123 Test Street, Test City, TS 12345',
    'Test booking - leak repair'
  )

  console.log('Message content:')
  console.log('---')
  console.log(testMessage)
  console.log('---\n')

  const success = await sendSMS({
    to: testPhone,
    message: testMessage,
  })

  if (success) {
    console.log('✅ SMS sent successfully!')
    console.log('Check your phone for the test message.')
  } else {
    console.log('❌ SMS failed to send')
    console.log('Check Twilio credentials in .env file:')
    console.log('- TWILIO_ACCOUNT_SID')
    console.log('- TWILIO_AUTH_TOKEN')
    console.log('- TWILIO_PHONE_NUMBER')
  }
}

main().catch(console.error)
