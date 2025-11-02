#!/usr/bin/env tsx

import 'dotenv/config'
import { createVapiClient } from '../src/lib/vapi'

async function main() {
  try {
    console.log('Testing Vapi searchPhoneNumbers API...')
    console.log('VAPI_API_KEY:', process.env.VAPI_API_KEY ? 'Set' : 'NOT SET')
    console.log('ENABLE_MOCK_MODE:', process.env.ENABLE_MOCK_MODE)
    
    const vapi = createVapiClient()
    
    // Test 1: No area code
    console.log('\n--- Test 1: No area code ---')
    try {
      const result1 = await vapi.searchPhoneNumbers()
      console.log(`✅ Success: Found ${result1.length} numbers`)
      if (result1.length > 0) {
        console.log('First number:', result1[0])
      }
    } catch (e: any) {
      console.error('❌ Error:', e.message)
    }
    
    // Test 2: With area code
    console.log('\n--- Test 2: With area code "205" ---')
    try {
      const result2 = await vapi.searchPhoneNumbers('205')
      console.log(`✅ Success: Found ${result2.length} numbers`)
      if (result2.length > 0) {
        console.log('First number:', result2[0])
      }
    } catch (e: any) {
      console.error('❌ Error:', e.message)
    }
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  }
}

main()

