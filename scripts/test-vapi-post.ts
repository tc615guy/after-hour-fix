#!/usr/bin/env tsx

import 'dotenv/config'
import axios from 'axios'

async function main() {
  const apiKey = process.env.VAPI_API_KEY
  if (!apiKey) {
    console.error('❌ VAPI_API_KEY not set')
    process.exit(1)
  }

  console.log('Testing POST to /phone-number/available...')
  
  const client = axios.create({
    baseURL: 'https://api.vapi.ai',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  try {
    // Test 1: POST with area code in body
    console.log('\n--- Test 1: POST with { areaCode: "205" } ---')
    try {
      const resp1 = await client.post('/phone-number/available', {
        areaCode: '205'
      })
      console.log('✅ Success:', resp1.data?.length || 0, 'numbers found')
      if (resp1.data?.length > 0) {
        console.log('First available:', resp1.data[0])
      }
    } catch (e: any) {
      console.error('❌ Error:', e.response?.data || e.message)
    }

    // Test 2: POST without body
    console.log('\n--- Test 2: POST with empty body ---')
    try {
      const resp2 = await client.post('/phone-number/available', {})
      console.log('✅ Success:', resp2.data?.length || 0, 'numbers found')
      if (resp2.data?.length > 0) {
        console.log('First available:', resp2.data[0])
      }
    } catch (e: any) {
      console.error('❌ Error:', e.response?.data || e.message)
    }

    // Test 3: Try GET without params (from test above, Test 2 worked)
    console.log('\n--- Test 3: GET without any params ---')
    try {
      const resp3 = await client.get('/phone-number/available')
      console.log('✅ Success:', resp3.data?.length || 0, 'numbers found')
      if (resp3.data?.length > 0) {
        console.log('First available:', resp3.data[0])
      }
    } catch (e: any) {
      console.error('❌ Error:', e.response?.data || e.message)
    }

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
  }
}

main()

