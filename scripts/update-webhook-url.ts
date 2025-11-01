import { prisma } from '../src/lib/db'

const NGROK_URL = process.argv[2] // Get ngrok URL from command line

if (!NGROK_URL) {
  console.error('❌ Please provide your ngrok URL as an argument')
  console.log('Usage: npx tsx scripts/update-webhook-url.ts https://your-ngrok-url.ngrok.io')
  process.exit(1)
}

// Validate URL format
if (!NGROK_URL.startsWith('http')) {
  console.error('❌ URL must start with http:// or https://')
  process.exit(1)
}

async function updateWebhookUrls() {
  try {
    console.log('🔍 Finding all agents with Vapi assistants...\n')

    const agents = await prisma.agent.findMany({
      where: {
        vapiAssistantId: {
          not: null,
        },
      },
      include: {
        project: true,
      },
    })

    if (agents.length === 0) {
      console.log('No agents with Vapi assistants found')
      return
    }

    console.log(`Found ${agents.length} agent(s) to update\n`)

    const VAPI_API_KEY = process.env.VAPI_API_KEY
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not found in environment')
    }

    const webhookUrl = `${NGROK_URL}/api/vapi/webhook`

    for (const agent of agents) {
      console.log(`📞 Updating ${agent.project.name} (${agent.project.trade})`)
      console.log(`   Assistant ID: ${agent.vapiAssistantId}`)

      try {
        const response = await fetch(`https://api.vapi.ai/assistant/${agent.vapiAssistantId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serverUrl: webhookUrl,
            serverUrlSecret: process.env.VAPI_SERVER_SECRET || 'your-secret-key',
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          console.log(`   ❌ Failed: ${error}`)
        } else {
          console.log(`   ✅ Updated successfully`)
          console.log(`   New webhook: ${webhookUrl}\n`)
        }
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}\n`)
      }
    }

    console.log('✅ All assistants updated!')
    console.log(`\n📋 Webhook URL set to: ${webhookUrl}`)
    console.log('\n💡 Remember to update this URL when you restart ngrok!')
    console.log('   (ngrok URLs change each time unless you have a paid account)\n')

  } catch (error) {
    console.error('Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateWebhookUrls()
