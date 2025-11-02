#!/usr/bin/env tsx

import 'dotenv/config'
import axios from 'axios'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'

const DEMO_ASSISTANTS = {
  'Demo Plumbing': '66ac9a80-cee3-4084-95fa-c51ede8ccf5c',
  'Demo HVAC': 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f',
  'Demo Electrical': 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5',
}

async function checkAssistant(name: string, id: string) {
  console.log(`\n📋 ${name}`)
  console.log(`   ID: ${id}`)

  try {
    const response = await axios.get(`${VAPI_BASE_URL}/assistant/${id}`, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
      },
    })

    const assistant = response.data

    console.log(`   Provider: ${assistant.model?.provider}`)
    console.log(`   Model: ${assistant.model?.model}`)
    console.log(`   Voice Provider: ${assistant.voice?.provider}`)
    console.log(`   Voice ID: ${assistant.voice?.voiceId}`)
    console.log(`   Recording: ${assistant.recordingEnabled}`)

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
  }
}

async function main() {
  console.log('🔍 Checking Demo Assistant Configurations\n')

  for (const [name, id] of Object.entries(DEMO_ASSISTANTS)) {
    await checkAssistant(name, id)
  }
}

main()
