#!/usr/bin/env tsx

/**
 * Remove SMS Pricing Sheet from Trade Assistants
 *
 * Updates Demo Electrical, Demo HVAC, and Demo Plumbing assistants
 * to remove the send_pricing_sheet function and related prompts
 */

import 'dotenv/config'

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_BASE_URL = 'https://api.vapi.ai'

if (!VAPI_API_KEY) {
  console.error('❌ Error: VAPI_API_KEY not found in .env file')
  process.exit(1)
}

const ASSISTANTS = [
  { name: 'Demo Plumbing', id: '66ac9a80-cee3-4084-95fa-c51ede8ccf5c' },
  { name: 'Demo HVAC', id: 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f' },
  { name: 'Demo Electrical', id: 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5' }
]

async function getAssistant(assistantId: string): Promise<any> {
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

async function updateAssistant(assistantId: string, updates: any): Promise<any> {
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

function cleanSystemPrompt(prompt: string): string {
  // Remove the pricing sheet SMS section
  let cleaned = prompt

  // Remove the old pricing section with SMS texting
  const oldPricingPattern = /## PRICING QUESTIONS[\s\S]*?(?=\n##|\n---|\Z)/

  const newPricingSection = `## PRICING QUESTIONS

When asked "How much?" or "What do you charge?":

**IF trip fee exists:**
"There's a $[AMOUNT] trip fee to come out, and the final price depends on the parts and labor needed. Our technician will provide a full quote when they arrive."

**IF no trip fee:**
"Pricing depends on parts and labor needed. Our tech will quote you on-site."

**FOR emergencies:**
Always add: "Emergency rates apply, typically 1.5x normal pricing."

---`

  if (cleaned.match(oldPricingPattern)) {
    cleaned = cleaned.replace(oldPricingPattern, newPricingSection)
    console.log('   ✓ Updated pricing section to remove SMS texting')
  } else {
    console.log('   ⚠ Could not find pricing section to update')
  }

  return cleaned
}

async function main() {
  console.log('🚀 Removing SMS Pricing Sheet from Trade Assistants\n')

  for (const assistant of ASSISTANTS) {
    try {
      console.log(`\n📋 Processing: ${assistant.name}`)
      console.log(`   ID: ${assistant.id}\n`)

      // Get current assistant config
      const current = await getAssistant(assistant.id)

      // Get system prompt
      let systemPrompt = ''
      if (current.model?.messages && current.model.messages.length > 0) {
        const systemMessage = current.model.messages.find((m: any) => m.role === 'system')
        if (systemMessage) {
          systemPrompt = systemMessage.content
        }
      }

      // Clean the system prompt
      const cleanedPrompt = cleanSystemPrompt(systemPrompt)

      // Remove send_pricing_sheet from tools
      const cleanedTools = (current.model?.tools || []).filter(
        (t: any) => t.function?.name !== 'send_pricing_sheet'
      )

      const removedCount = (current.model?.tools || []).length - cleanedTools.length
      if (removedCount > 0) {
        console.log(`   ✓ Removed ${removedCount} send_pricing_sheet function(s)`)
      } else {
        console.log('   ⚠ No send_pricing_sheet function found')
      }

      // Prepare update
      const updates = {
        model: {
          ...current.model,
          messages: [
            {
              role: 'system',
              content: cleanedPrompt
            }
          ],
          tools: cleanedTools
        }
      }

      // Update assistant
      await updateAssistant(assistant.id, updates)
      console.log(`   ✅ ${assistant.name} updated successfully!`)

    } catch (error) {
      console.error(`   ❌ Failed to update ${assistant.name}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log('\n\n🎉 All done!\n')
  console.log('Summary:')
  console.log('  - Removed SMS pricing sheet texting feature')
  console.log('  - Updated pricing responses to mention trip fee only')
  console.log('  - Removed send_pricing_sheet function from tools')
  console.log('\n')
}

main()
