#!/usr/bin/env tsx

/**
 * ADD PHONE NUMBER FOR DEMO ELECTRICAL
 * 
 * Purchases a phone number and attaches it to Demo Electrical assistant
 */

import 'dotenv/config'
import axios from 'axios'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'

if (!VAPI_API_KEY) {
  console.error('❌ VAPI_API_KEY not found in .env')
  process.exit(1)
}

// Demo Electrical assistant ID
const ELECTRICAL_ASSISTANT_ID = 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5'

async function searchNumbers(areaCode?: string): Promise<any[]> {
  try {
    const params = areaCode ? { areaCode } : {}
    const res = await axios.get(`${VAPI_BASE_URL}/phone-number/available`, {
      params,
      headers: { Authorization: `Bearer ${VAPI_API_KEY}` }
    })
    
    return res.data || []
  } catch (error: any) {
    // Ignore errors, just return empty array
    return []
  }
}

async function purchaseNumber(number: string) {
  try {
    const res = await axios.post(
      `${VAPI_BASE_URL}/phone-number`,
      {
        number,
        assistantId: ELECTRICAL_ASSISTANT_ID,
        serverUrl: `${APP_URL}/api/vapi/webhook`,
        serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET,
      },
      {
        headers: {
          Authorization: `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    return res.data
  } catch (error: any) {
    console.error('Error purchasing number:', error.response?.data || error.message)
    throw error
  }
}

async function main() {
  console.log('📞 ADDING PHONE NUMBER FOR DEMO ELECTRICAL\n')
  console.log('=' .repeat(70))
  
  try {
    // Step 1: Search for available numbers
    console.log('\n🔍 Searching for available phone numbers...')
    const areaCodes = ['312', '773', '872', '205', '615'] // Try multiple area codes
    
    let availableNumbers: any[] = []
    let selectedAreaCode = ''
    
    for (const ac of areaCodes) {
      const nums = await searchNumbers(ac)
      if (nums.length > 0) {
        availableNumbers = nums
        selectedAreaCode = ac
        console.log(`✅ Found ${nums.length} numbers in area code ${ac}`)
        break
      }
    }
    
    if (availableNumbers.length === 0) {
      console.log('❌ No numbers available in common area codes!')
      console.log('Try checking Vapi dashboard or importing a number')
      return
    }
    
    console.log(`\n✅ Found ${availableNumbers.length} available numbers:`)
    for (const num of availableNumbers.slice(0, 5)) {
      console.log(`   • ${num.number}`)
    }
    
    // Step 2: Purchase the first available
    const firstNumber = availableNumbers[0]
    console.log(`\n💰 Purchasing ${firstNumber.number}...`)
    
    const purchased = await purchaseNumber(firstNumber.number)
    
    console.log(`\n✅ NUMBER PURCHASED!`)
    console.log(`   Number: ${purchased.number}`)
    console.log(`   Vapi Number ID: ${purchased.id}`)
    console.log(`   Attached to: Demo Electrical`)
    console.log(`   Server URL: ${APP_URL}/api/vapi/webhook`)
    console.log('\n📝 Database will auto-sync on next number purchase/sync')
    console.log('   Or you can manually sync via Settings → Phone Numbers')
    console.log('')
    
  } catch (error: any) {
    console.error('\n❌ Failed:', error.response?.data || error.message)
  }
}

main()

