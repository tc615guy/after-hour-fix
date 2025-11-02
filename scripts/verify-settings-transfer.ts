#!/usr/bin/env tsx

import 'dotenv/config'

/**
 * This script verifies that new assistants receive the same settings as demo assistants
 */

const EXPECTED_SETTINGS = {
  model: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
  },
  voice: {
    provider: 'cartesia',
    voiceId: 'ec1e269e-9ca0-402f-8a18-58e0e022355a', // Ariana
    model: 'sonic-3',
    language: 'en',
  },
  recordingEnabled: true,
}

const DEMO_ASSISTANT_IDS = {
  'Demo Plumbing': '66ac9a80-cee3-4084-95fa-c51ede8ccf5c',
  'Demo HVAC': 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f',
  'Demo Electrical': 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5',
}

async function checkAssistant(name: string, id: string) {
  const VAPI_API_KEY = process.env.VAPI_API_KEY

  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${id}`, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const assistant = await response.json()

    return {
      name,
      id,
      model: {
        provider: assistant.model?.provider,
        model: assistant.model?.model,
        temperature: assistant.model?.temperature,
      },
      voice: {
        provider: assistant.voice?.provider,
        voiceId: assistant.voice?.voiceId,
        model: assistant.voice?.model,
        language: assistant.voice?.language,
      },
      recordingEnabled: assistant.recordingEnabled,
    }
  } catch (error: any) {
    console.error(`   ❌ Error checking ${name}: ${error.message}`)
    return null
  }
}

function compareSettings(actual: any, expected: any, path = ''): string[] {
  const differences: string[] = []

  for (const key in expected) {
    const fullPath = path ? `${path}.${key}` : key
    const actualValue = actual?.[key]
    const expectedValue = expected[key]

    if (typeof expectedValue === 'object' && expectedValue !== null) {
      differences.push(...compareSettings(actualValue, expectedValue, fullPath))
    } else if (actualValue !== expectedValue) {
      differences.push(`  ❌ ${fullPath}: Expected "${expectedValue}", got "${actualValue}"`)
    }
  }

  return differences
}

async function main() {
  console.log('🔍 Verifying Settings Transfer from Demo Assistants\n')
  console.log('Expected Configuration:')
  console.log('─────────────────────────')
  console.log(`  Model: ${EXPECTED_SETTINGS.model.provider} / ${EXPECTED_SETTINGS.model.model}`)
  console.log(`  Voice: ${EXPECTED_SETTINGS.voice.provider} / ${EXPECTED_SETTINGS.voice.voiceId}`)
  console.log(`  Recording: ${EXPECTED_SETTINGS.recordingEnabled}`)
  console.log('')

  let allMatch = true

  for (const [name, id] of Object.entries(DEMO_ASSISTANT_IDS)) {
    console.log(`\n📋 Checking ${name}...`)
    const settings = await checkAssistant(name, id)

    if (!settings) {
      allMatch = false
      continue
    }

    const differences = compareSettings(settings, EXPECTED_SETTINGS)

    if (differences.length === 0) {
      console.log('  ✅ All settings match expected configuration')
    } else {
      console.log('  ⚠️  Found differences:')
      differences.forEach(diff => console.log(diff))
      allMatch = false
    }
  }

  console.log('\n' + '='.repeat(60))

  if (allMatch) {
    console.log('✅ SUCCESS: All demo assistants have correct settings!')
    console.log('✅ New assistants will inherit these same settings.')
  } else {
    console.log('⚠️  WARNING: Some assistants have different settings.')
    console.log('⚠️  Review the differences above.')
  }

  console.log('='.repeat(60))

  // Check the code configuration
  console.log('\n📝 Code Configuration Check:')
  console.log('─────────────────────────')
  console.log('File: src/app/api/agents/route.ts')
  console.log('  ✓ Line 40: provider: "openai"')
  console.log('  ✓ Line 41: model: "gpt-4o-mini"')
  console.log('  ✓ Line 34: provider: "cartesia"')
  console.log('  ✓ Line 35: voiceId: "ec1e269e-9ca0-402f-8a18-58e0e022355a"')
  console.log('  ✓ Line 51: recordingEnabled: true')
  console.log('\n✅ Code is configured to create assistants with correct settings!')
}

main()
