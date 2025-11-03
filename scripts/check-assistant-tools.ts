#!/usr/bin/env tsx

/**
 * Check VAPI assistant configuration and tool setup
 */

import 'dotenv/config'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'

// Your main assistant ID
const ASSISTANT_ID = '3d8a9feb-6089-42d7-996f-d03555702f6f' // Josh's Heating and Cooling

if (!VAPI_API_KEY) {
  console.error('❌ VAPI_API_KEY not found')
  process.exit(1)
}

async function checkAssistant(assistantId: string) {
  try {
    console.log(`\n🔍 Checking assistant: ${assistantId}\n`)

    const response = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch assistant: ${response.statusText}`)
    }

    const assistant = await response.json()

    console.log('📋 Assistant Name:', assistant.name)
    console.log('📞 First Message:', assistant.firstMessage)
    console.log('\n🛠️  Tools Configuration:\n')

    const serverFunctions = assistant.model?.tools || []

    if (serverFunctions.length === 0) {
      console.log('⚠️  No tools configured!')
      return
    }

    for (const tool of serverFunctions) {
      if (tool.type === 'function') {
        console.log(`\n✅ Function: ${tool.function.name}`)
        console.log(`   Description: ${tool.function.description || 'N/A'}`)

        if (tool.function.server) {
          console.log(`   🌐 Server URL: ${tool.function.server.url}`)
          console.log(`   🔒 Has Secret: ${tool.function.server.secret ? 'Yes' : 'No'}`)
        } else if (tool.function.async) {
          console.log(`   🌐 Async URL: ${tool.function.async.url}`)
          console.log(`   🔒 Has Secret: ${tool.function.async.secret ? 'Yes' : 'No'}`)
        } else {
          console.log(`   ⚠️  No server/async configuration!`)
        }

        if (tool.function.parameters) {
          console.log(`   📝 Parameters:`, JSON.stringify(tool.function.parameters.properties || {}, null, 4))
        }
      }
    }

    console.log('\n\n📄 Full Model Config:\n')
    console.log(JSON.stringify(assistant.model, null, 2))

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

checkAssistant(ASSISTANT_ID)
