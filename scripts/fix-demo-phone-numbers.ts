#!/usr/bin/env tsx

/**
 * FIX DEMO PHONE NUMBERS
 * 
 * Problem: Two phone numbers are attached to deleted assistants
 * Solution: Attach them to the correct demo assistants
 */

import 'dotenv/config'
import axios from 'axios'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'

// Current correct assistant IDs
const ASSISTANTS = {
  'Demo Plumbing': '66ac9a80-cee3-4084-95fa-c51ede8ccf5c',
  'Demo HVAC': 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f',
  'Demo Electrical': 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5',
}

// Phone numbers that need fixing
const ORPHANED_NUMBERS = [
  {
    number: '+19168664042',
    vapiNumberId: '43c0e746-587d-4d73-b984-0258ef1ad7a9',
    oldAssistantId: '6d0cbda1-0b1d-4d24-bcc9-dfab156b5fbb', // Old Demo Plumbing
    newAssistantId: '66ac9a80-cee3-4084-95fa-c51ede8ccf5c', // New Demo Plumbing
    projectId: 'demo-plumbing',
    assistantName: 'Demo Plumbing'
  },
  {
    number: '+14702936031',
    vapiNumberId: '7dbd4993-e37f-4bd6-9f11-f20359762b45',
    oldAssistantId: 'b4c5a804-085f-4697-84ab-10453df3cf0a', // Unknown deleted
    newAssistantId: 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f', // Demo HVAC
    projectId: 'demo-hvac',
    assistantName: 'Demo HVAC'
  }
]

async function fixNumber(num: any) {
  console.log(`\n🔧 Fixing ${num.number}`)
  console.log(`   Old Assistant ID: ${num.oldAssistantId}`)
  console.log(`   New Assistant ID: ${num.newAssistantId} (${num.assistantName})`)
  
  try {
    // Step 1: Attach number to new assistant in Vapi
    const res = await axios.patch(
      `${VAPI_BASE_URL}/phone-number/${num.vapiNumberId}`,
      {
        assistantId: num.newAssistantId,
        serverUrl: 'https://afterhourfix.com/api/vapi/webhook',
        serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET,
      },
      {
        headers: {
          Authorization: `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    console.log(`   ✅ Attached to ${num.assistantName} in Vapi`)
    
  } catch (error: any) {
    console.error(`   ❌ Error:`, error.response?.data || error.message)
    throw error
  }
}

async function main() {
  console.log('🔧 FIXING DEMO PHONE NUMBER CONFIGURATION\n')
  console.log('=' .repeat(70))
  console.log('\nProblem: Two phone numbers are attached to deleted assistants')
  console.log('Solution: Reattach them to the correct demo assistants')
  console.log('=' .repeat(70))
  
  try {
    for (const num of ORPHANED_NUMBERS) {
      await fixNumber(num)
    }
    
    console.log(`\n${'='.repeat(70)}`)
    console.log('\n✅ ALL NUMBERS FIXED IN VAPI!')
    console.log(`\nFixed ${ORPHANED_NUMBERS.length} orphaned phone numbers`)
    console.log('All demo assistants now have their phone numbers properly configured in Vapi.')
    console.log('\n📝 Note: Database sync will happen automatically on next number purchase/sync')
    console.log('   Or run: npm run db:seed to sync phone numbers to database')
    console.log('')
    
  } catch (error: any) {
    console.error('\n❌ Failed:', error.message)
  }
}

main()

