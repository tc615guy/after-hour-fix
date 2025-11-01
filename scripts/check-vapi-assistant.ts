import 'dotenv/config'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'
const WEBHOOK_URL = process.env.VAPI_WEBHOOK_URL

const KL_ELECTRIC_ASSISTANT_ID = 'b4c5a804-085f-4697-84ab-10453df3cf0a'

async function getAssistant(assistantId: string) {
  const response = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to get assistant: ${response.statusText}`)
  }

  return response.json()
}

async function updateAssistant(assistantId: string, updates: any) {
  const response = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update assistant: ${response.statusText}\n${error}`)
  }

  return response.json()
}

async function main() {
  console.log('🔍 Checking KL Electric Assistant Configuration\n')
  console.log(`Assistant ID: ${KL_ELECTRIC_ASSISTANT_ID}`)
  console.log(`Expected Webhook: ${WEBHOOK_URL}\n`)

  const assistant = await getAssistant(KL_ELECTRIC_ASSISTANT_ID)

  console.log('=== CURRENT CONFIGURATION ===')
  console.log(`Name: ${assistant.name}`)
  console.log(`Server URL: ${assistant.serverUrl || 'NOT SET'}`)
  console.log(`Server URL Secret: ${assistant.serverUrlSecret ? 'SET' : 'NOT SET'}`)
  console.log(`\nModel: ${assistant.model?.provider} ${assistant.model?.model}`)
  console.log(`Voice: ${assistant.voice?.provider} (ID: ${assistant.voice?.voiceId})`)

  if (assistant.model?.tools) {
    console.log(`\nTools configured: ${assistant.model.tools.length}`)
    assistant.model.tools.forEach((tool: any) => {
      console.log(`  - ${tool.function?.name || tool.type}`)
      if (tool.server?.url) {
        console.log(`    URL: ${tool.server.url}`)
      }
    })
  }

  // Check if webhook URL needs updating
  if (assistant.serverUrl !== WEBHOOK_URL) {
    console.log(`\n⚠️  Webhook URL mismatch!`)
    console.log(`Current:  ${assistant.serverUrl || 'NONE'}`)
    console.log(`Expected: ${WEBHOOK_URL}`)
    console.log(`\n🔧 Updating assistant with correct webhook URL...`)

    const updates = {
      serverUrl: WEBHOOK_URL
    }

    const updated = await updateAssistant(KL_ELECTRIC_ASSISTANT_ID, updates)
    console.log(`\n✅ Successfully updated webhook URL!`)
  } else {
    console.log(`\n✅ Webhook URL is correctly configured!`)
  }
}

main().catch(console.error)
