#!/usr/bin/env tsx

/**
 * Update all 3 demo assistants directly via VAPI API
 * No database access needed - uses VAPI API directly
 */

import 'dotenv/config'
import { buildAssistantTools, buildAssistantPrompt } from '@/lib/vapi'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'

if (!VAPI_API_KEY) {
  console.error('❌ VAPI_API_KEY not found')
  process.exit(1)
}

// Demo assistants with their project IDs and trade info
const DEMO_ASSISTANTS = [
  {
    vapiAssistantId: '3d8a9feb-6089-42d7-996f-d03555702f6f',
    name: "Josh's Heating and Cooling",
    projectId: 'cmhi8al3a0001l504q942hc16',
    trade: 'hvac',
  },
  {
    vapiAssistantId: '66ac9a80-cee3-4084-95fa-c51ede8ccf5c',
    name: 'Demo Plumbing',
    projectId: 'cmhi8al3a0001l504q942hc16',
    trade: 'plumbing',
  },
  {
    vapiAssistantId: 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f',
    name: 'Demo HVAC',
    projectId: 'cmhj4fvpv0001m90456g1k4bz',
    trade: 'hvac',
  },
  {
    vapiAssistantId: 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5',
    name: 'Demo Electrical',
    projectId: 'cmhj4l6a30001ub0m0g5y0j5a',
    trade: 'electrical',
  },
]

async function updateAssistant(demo: typeof DEMO_ASSISTANTS[0]) {
  try {
    console.log(`\n🔧 Updating ${demo.name}...`)
    console.log(`   VAPI ID: ${demo.vapiAssistantId}`)
    console.log(`   Project ID: ${demo.projectId}`)

    // Get current assistant config to preserve voice settings
    const currentResp = await fetch(`${VAPI_BASE_URL}/assistant/${demo.vapiAssistantId}`, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
      },
    })

    if (!currentResp.ok) {
      throw new Error(`Failed to get assistant: ${currentResp.statusText}`)
    }

    const current = await currentResp.json()
    const existingModel = current.model || {}
    const provider = existingModel.provider || 'openai'
    const modelName = existingModel.model || 'gpt-4o-mini'

    // Build latest tools and prompt
    const tools = buildAssistantTools(APP_URL, demo.projectId)
    const systemPrompt = buildAssistantPrompt(demo.name, demo.trade)

    console.log(`   📝 Tools: ${tools.length}`)
    console.log(`   📝 System prompt: ${systemPrompt.length} chars`)

    // Update assistant
    const updateResp = await fetch(`${VAPI_BASE_URL}/assistant/${demo.vapiAssistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: {
          provider,
          model: modelName,
          temperature: existingModel.temperature ?? 0.7,
          messages: [{ role: 'system', content: systemPrompt }],
          tools,
        },
      }),
    })

    if (!updateResp.ok) {
      const errorText = await updateResp.text()
      throw new Error(`Failed to update assistant: ${updateResp.statusText} - ${errorText}`)
    }

    console.log(`   ✅ Updated successfully`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 Updating All Assistants with Latest Features\n')
  console.log('='.repeat(70))

  let successCount = 0
  for (const demo of DEMO_ASSISTANTS) {
    const success = await updateAssistant(demo)
    if (success) successCount++
  }

  console.log('\n' + '='.repeat(70))
  console.log(`✅ Update complete: ${successCount}/${DEMO_ASSISTANTS.length} assistants updated`)
  console.log('='.repeat(70) + '\n')
}

main().catch((e) => {
  console.error('❌ Fatal error:', e.message)
  process.exit(1)
})
