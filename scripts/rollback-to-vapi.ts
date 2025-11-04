#!/usr/bin/env tsx

/**
 * Rollback Script: Rollback Agents from OpenAI Realtime to Vapi
 * 
 * This script rolls back agents and their phone numbers from OpenAI Realtime to Vapi.
 * It performs the following actions:
 * 1. Updates agent systemType back to 'vapi'
 * 2. Updates phone number systemType back to 'vapi'
 * 3. Re-configures Twilio phone numbers to use Vapi (via Vapi API)
 * 4. Logs all changes to EventLog
 * 
 * Usage:
 *   # Rollback specific agent
 *   tsx scripts/rollback-to-vapi.ts --agent-id <agent-id>
 * 
 *   # Rollback all agents for a project
 *   tsx scripts/rollback-to-vapi.ts --project-id <project-id>
 * 
 *   # Dry run (preview changes without applying)
 *   tsx scripts/rollback-to-vapi.ts --project-id <project-id> --dry-run
 */

import 'dotenv/config'
import { prisma } from '../src/lib/db'
import { createVapiClient } from '../src/lib/vapi'
import twilio from 'twilio'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'

interface RollbackResult {
  agentId: string
  agentName: string
  projectId: string
  projectName: string
  phoneNumbers: {
    e164: string
    label: string | null
    success: boolean
    error?: string
  }[]
  success: boolean
  error?: string
}

async function configureVapiNumber(
  phoneNumber: string,
  vapiNumberId: string,
  assistantId: string,
  vapiClient: any
): Promise<void> {
  const serverUrl = `${APP_URL}/api/vapi/webhook`
  const serverUrlSecret = process.env.VAPI_WEBHOOK_SECRET

  // Re-configure Vapi number
  await vapiClient.attachNumberToAssistant(vapiNumberId, assistantId)
  
  // Update server URL if needed (Vapi may handle this automatically)
  // The number should already be configured in Vapi from before migration

  console.log(`  ✅ Re-configured Vapi number ${phoneNumber}`)
}

async function rollbackAgent(agentId: string, dryRun: boolean): Promise<RollbackResult> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      project: {
        include: {
          numbers: {
            where: { deletedAt: null },
          },
        },
      },
    },
  })

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`)
  }

  if (agent.systemType === 'vapi') {
    console.log(`  ⏭️  Agent ${agent.name} is already on Vapi`)
    return {
      agentId: agent.id,
      agentName: agent.name,
      projectId: agent.projectId,
      projectName: agent.project.name,
      phoneNumbers: [],
      success: true,
    }
  }

  console.log(`\n📋 Rolling back agent: ${agent.name} (${agent.id})`)
  console.log(`   Project: ${agent.project.name}`)
  console.log(`   Phone numbers: ${agent.project.numbers.length}`)

  const result: RollbackResult = {
    agentId: agent.id,
    agentName: agent.name,
    projectId: agent.projectId,
    projectName: agent.project.name,
    phoneNumbers: [],
    success: true,
  }

  // Initialize clients if needed
  let vapiClient: any = null
  let twilioClient: twilio.Twilio | null = null
  
  if (agent.project.numbers.length > 0) {
    const vapiApiKey = process.env.VAPI_API_KEY
    if (!vapiApiKey) {
      throw new Error('VAPI_API_KEY must be set to rollback to Vapi')
    }
    vapiClient = createVapiClient()

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set to configure phone numbers')
    }
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  }

  // Rollback phone numbers
  for (const phoneNumber of agent.project.numbers) {
    try {
      console.log(`  📞 Rolling back phone number: ${phoneNumber.e164}`)

      if (dryRun) {
        console.log(`     [DRY RUN] Would update systemType to 'vapi'`)
        if (vapiClient && phoneNumber.vapiNumberId) {
          console.log(`     [DRY RUN] Would re-configure Vapi number`)
        }
        result.phoneNumbers.push({
          e164: phoneNumber.e164,
          label: phoneNumber.label,
          success: true,
        })
        continue
      }

      // Update phone number systemType
      await prisma.phoneNumber.update({
        where: { id: phoneNumber.id },
        data: { systemType: 'vapi' },
      })

      // Re-configure Vapi number
      if (vapiClient && phoneNumber.vapiNumberId) {
        await configureVapiNumber(
          phoneNumber.e164,
          phoneNumber.vapiNumberId,
          agent.vapiAssistantId,
          vapiClient
        )
      } else {
        console.warn(`     ⚠️  No Vapi number ID found for ${phoneNumber.e164} - may need manual configuration`)
      }

      result.phoneNumbers.push({
        e164: phoneNumber.e164,
        label: phoneNumber.label,
        success: true,
      })
    } catch (error: any) {
      console.error(`     ❌ Error rolling back phone number ${phoneNumber.e164}:`, error.message)
      result.phoneNumbers.push({
        e164: phoneNumber.e164,
        label: phoneNumber.label,
        success: false,
        error: error.message,
      })
      result.success = false
    }
  }

  // Update agent systemType
  if (!dryRun) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { systemType: 'vapi' },
    })

    // Log rollback
    await prisma.eventLog.create({
      data: {
        projectId: agent.projectId,
        type: 'migration.rollback_to_vapi',
        payload: {
          agentId: agent.id,
          phoneNumbersRolledBack: result.phoneNumbers.length,
          phoneNumbersSuccess: result.phoneNumbers.filter(p => p.success).length,
        },
      },
    })
  } else {
    console.log(`  [DRY RUN] Would update agent systemType to 'vapi'`)
  }

  console.log(`  ✅ Agent rollback ${dryRun ? 'preview' : 'complete'}`)
  return result
}

async function main() {
  const args = process.argv.slice(2)
  const agentIdIndex = args.indexOf('--agent-id')
  const projectIdIndex = args.indexOf('--project-id')
  const dryRun = args.includes('--dry-run')

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be applied\n')
  }

  let agentsToRollback: string[] = []

  if (agentIdIndex !== -1 && args[agentIdIndex + 1]) {
    // Rollback specific agent
    agentsToRollback = [args[agentIdIndex + 1]]
  } else if (projectIdIndex !== -1 && args[projectIdIndex + 1]) {
    // Rollback all agents for a project
    const projectId = args[projectIdIndex + 1]
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        agents: {
          where: { deletedAt: null, systemType: 'openai-realtime' },
        },
      },
    })

    if (!project) {
      console.error(`❌ Project not found: ${projectId}`)
      process.exit(1)
    }

    if (project.agents.length === 0) {
      console.log(`✅ No agents to rollback for project ${project.name}`)
      process.exit(0)
    }

    agentsToRollback = project.agents.map(a => a.id)
    console.log(`📋 Found ${agentsToRollback.length} agent(s) to rollback for project: ${project.name}\n`)
  } else {
    console.error('Usage:')
    console.error('  tsx scripts/rollback-to-vapi.ts --agent-id <agent-id>')
    console.error('  tsx scripts/rollback-to-vapi.ts --project-id <project-id>')
    console.error('  Add --dry-run to preview changes without applying')
    process.exit(1)
  }

  const results: RollbackResult[] = []

  for (const agentId of agentsToRollback) {
    try {
      const result = await rollbackAgent(agentId, dryRun)
      results.push(result)
    } catch (error: any) {
      console.error(`❌ Error rolling back agent ${agentId}:`, error.message)
      results.push({
        agentId,
        agentName: 'Unknown',
        projectId: 'Unknown',
        projectName: 'Unknown',
        phoneNumbers: [],
        success: false,
        error: error.message,
      })
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('ROLLBACK SUMMARY')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalPhones = results.reduce((sum, r) => sum + r.phoneNumbers.length, 0)
  const successfulPhones = results.reduce((sum, r) => sum + r.phoneNumbers.filter(p => p.success).length, 0)

  console.log(`Agents rolled back: ${successful}/${results.length} successful, ${failed} failed`)
  console.log(`Phone numbers configured: ${successfulPhones}/${totalPhones} successful`)

  if (dryRun) {
    console.log('\n⚠️  This was a DRY RUN - no changes were applied')
    console.log('Run without --dry-run to apply changes')
  }

  if (failed > 0) {
    console.log('\n❌ Some rollbacks failed. Review errors above.')
    process.exit(1)
  } else {
    console.log('\n✅ All rollbacks completed successfully!')
  }
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
