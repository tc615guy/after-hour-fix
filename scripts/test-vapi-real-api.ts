#!/usr/bin/env tsx

import 'dotenv/config'
import axios from 'axios'

async function main() {
  const apiKey = process.env.VAPI_API_KEY
  if (!apiKey) {
    console.error('❌ VAPI_API_KEY not set')
    process.exit(1)
  }

  console.log('Testing Vapi API endpoints...')
  
  const client = axios.create({
    baseURL: 'https://api.vapi.ai',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  try {
    // Test 1: List existing phone numbers
    console.log('\n--- Test 1: List phone numbers (GET /phone-number) ---')
    try {
      const resp1 = await client.get('/phone-number')
      console.log('✅ Success:', resp1.data.length, 'numbers found')
      if (resp1.data.length > 0) {
        console.log('First number:', resp1.data[0])
      }
    } catch (e: any) {
      console.error('❌ Error:', e.response?.data || e.message)
    }

    // Test 2: Search available numbers WITHOUT area code
    console.log('\n--- Test 2: Search available (GET /phone-number/available) ---')
    try {
      const resp2 = await client.get('/phone-number/available')
      console.log('✅ Success:', resp2.data?.length || 0, 'numbers found')
      if (resp2.data?.length > 0) {
        console.log('First available:', resp2.data[0])
      }
    } catch (e: any) {
      console.error('❌ Error:', e.response?.data || e.message)
    }

    // Test 3: Search available WITH area code
    console.log('\n--- Test 3: Search with area code (GET /phone-number/available?areaCode=205) ---')
    try {
      const resp3 = await client.get('/phone-number/available', {
        params: { areaCode: '205' }
      })
      console.log('✅ Success:', resp3.data?.length || 0, 'numbers found')
      if (resp3.data?.length > 0) {
        console.log('First available:', resp3.data[0])
      }
    } catch (e: any) {
      console.error('❌ Error:', e.response?.data || e.message)
    }

    // Test 4: Try different param name
    console.log('\n--- Test 4: Try "area_code" instead of "areaCode" ---')
    try {
      const resp4 = await client.get('/phone-number/available', {
        params: { area_code: '205' }
      })
      console.log('✅ Success:', resp4.data?.length || 0, 'numbers found')
      if (resp4.data?.length > 0) {
        console.log('First available:', resp4.data[0])
      }
    } catch (e: any) {
      console.error('❌ Error:', e.response?.data || e.message)
    }

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
  }
}

main()

