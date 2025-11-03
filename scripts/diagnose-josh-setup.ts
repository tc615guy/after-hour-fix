#!/usr/bin/env tsx

import { prisma } from '@/lib/db'
import { createVapiClient } from '@/lib/vapi'
import axios from 'axios'
import 'dotenv/config'

/**
 * Diagnostic script to check Josh's Heating and Cooling setup
 */

async function main() {
  console.log('🔍 Diagnosing Josh\'s Heating and Cooling Setup\n')
  console.log('='.repeat(80))

  // Find Josh's project
  const joshProject = await prisma.project.findFirst({
    where: {
      owner: {
        email: 'joshlanius@yahoo.com'
      }
    },
    include: {
      agents: true,
      numbers: true,
      owner: true,
    }
  })

  if (!joshProject) {
    console.error('❌ Josh\'s project not found')
    process.exit(1)
  }

  console.log('\n📋 Project Info:')
  console.log(`   Name: ${joshProject.name}`)
  console.log(`   Trade: ${joshProject.trade}`)
  console.log(`   Plan: ${joshProject.plan}`)
  console.log(`   Owner: ${joshProject.owner.email}`)
  console.log(`   Cal.com Connected: ${!!joshProject.calcomApiKey}`)
  console.log(`   Event Type ID: ${joshProject.calcomEventTypeId}`)

  if (joshProject.agents.length > 0) {
    console.log('\n🤖 Assigned Assistants:')
    for (const agent of joshProject.agents) {
      console.log(`   - ${agent.name} (Vapi ID: ${agent.vapiAssistantId})`)
    }
  } else {
    console.log('\n❌ No assistants assigned to this project!')
  }

  if (joshProject.numbers.length > 0) {
    console.log('\n📞 Phone Numbers:')
    for (const num of joshProject.numbers) {
      console.log(`   - ${num.e164} (Label: ${num.label || 'N/A'})`)
    }
  } else {
    console.log('\n❌ No phone numbers assigned to this project!')
  }

  // Check Vapi assistant configuration
  if (joshProject.agents.length > 0) {
    const vapi = createVapiClient()
    const mainAgent = joshProject.agents[0]
    
    console.log('\n🔧 Vapi Assistant Configuration:')
    try {
      const assistant = await vapi.getAssistant(mainAgent.vapiAssistantId)
      const model: any = assistant?.model || {}
      
      console.log(`   Provider: ${model.provider}`)
      console.log(`   Model: ${model.model}`)
      console.log(`   Temperature: ${model.temperature}`)
      
      if (model.tools && Array.isArray(model.tools)) {
        console.log(`\n   Tools (${model.tools.length}):`)
        for (const tool of model.tools) {
          const func = tool.function || {}
          const server = tool.server || {}
          console.log(`     - ${func.name}`)
          console.log(`       URL: ${server.url}`)
        }
      } else {
        console.log('\n   ⚠️  No tools found!')
      }

      // Check if tools have correct projectId
      const hasCorrectProjectId = model.tools?.some((t: any) => 
        t.server?.url?.includes(`projectId=${joshProject.id}`)
      )
      
      if (hasCorrectProjectId) {
        console.log('\n   ✅ Tools are correctly configured with projectId')
      } else {
        console.log('\n   ❌ Tools may not have correct projectId!')
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to fetch assistant: ${error.message}`)
    }
  }

  // Check Vapi phone numbers
  console.log('\n📱 Checking Vapi Phone Number Configuration...')
  try {
    const apiKey = process.env.VAPI_API_KEY
    if (!apiKey) throw new Error('VAPI_API_KEY not set')

    const http = axios.create({
      baseURL: 'https://api.vapi.ai',
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    const resp = await http.get('/phone-number')
    const allNumbers: Array<{ id: string; number: string; assistantId?: string | null; provider?: string }> = resp.data

    if (joshProject.numbers.length > 0) {
      for (const num of joshProject.numbers) {
        const vapiNum = allNumbers.find(n => n.number === num.e164)
        if (vapiNum) {
          console.log(`\n   ${num.e164}:`)
          console.log(`     - Vapi Number ID: ${vapiNum.id}`)
          console.log(`     - Provider: ${vapiNum.provider || 'N/A'}`)
          console.log(`     - Connected Assistant: ${vapiNum.assistantId || 'NONE'}`)
          
          // Check if it's connected to the right assistant
          if (joshProject.agents.length > 0) {
            const expectedAssistant = joshProject.agents[0].vapiAssistantId
            if (vapiNum.assistantId === expectedAssistant) {
              console.log(`     ✅ Correctly connected to Josh's assistant`)
            } else {
              console.log(`     ❌ WRONG ASSISTANT! Expected: ${expectedAssistant}`)
              console.log(`     ❌ This may be connected to Demo HVAC or another project!`)
            }
          }
        } else {
          console.log(`\n   ⚠️  ${num.e164} not found in Vapi account`)
        }
      }
    }
  } catch (error: any) {
    console.error(`   ❌ Failed to check Vapi numbers: ${error.message}`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n✅ Diagnostic complete')
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e.message, e.stack)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

