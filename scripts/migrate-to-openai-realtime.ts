#!/usr/bin/env tsx

/**
 * Migration Script: Migrate Agents from Vapi to OpenAI Realtime
 * 
 * This script migrates agents and their phone numbers from Vapi to OpenAI Realtime.
 * It performs the following actions:
 * 1. Updates agent systemType to 'openai-realtime'
 * 2. Updates phone number systemType to 'openai-realtime'
 * 3. Configures Twilio phone numbers to point to OpenAI Realtime server
 * 4. Logs all changes to EventLog
 * 
 * Usage:
 *   # Migrate specific agent
 *   tsx scripts/migrate-to-openai-realtime.ts --agent-id <agent-id>
 * 
 *   # Migrate all agents for a project
 *   tsx scripts/migrate-to-openai-realtime.ts --project-id <project-id>
 * 
 *   # Dry run (preview changes without applying)
 *   tsx scripts/migrate-to-openai-realtime.ts --project-id <project-id> --dry-run
 * 
 *   # Migrate all Vapi agents (use with caution)
 *   tsx scripts/migrate-to-openai-realtime.ts --all
 */

import 'dotenv/config'
import { prisma } from '../src/lib/db'
import twilio from 'twilio'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const OPENAI_REALTIME_SERVER_URL = process.env.OPENAI_REALTIME_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'

interface MigrationResult {
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

async function configureTwilioNumber(phoneNumber: string, twilioClient: twilio.Twilio): Promise<void> {
  // Get the phone number SID
  const numbers = await twilioClient.incomingPhoneNumbers.list({ phoneNumber })
  if (numbers.length === 0) {
    throw new Error(`Phone number ${phoneNumber} not found in Twilio account`)
  }

  const numberSid = numbers[0].sid
  const voiceUrl = `${OPENAI_REALTIME_SERVER_URL}/twilio/voice`

  // Update phone number to use OpenAI Realtime TwiML endpoint
  await twilioClient.incomingPhoneNumbers(numberSid).update({
    voiceUrl,
    voiceMethod: 'POST',
    statusCallback: `${OPENAI_REALTIME_SERVER_URL}/twilio/status`,
    statusCallbackMethod: 'POST',
  })

  console.log(`  ✅ Configured Twilio number ${phoneNumber} to point to ${voiceUrl}`)
}

async function migrateAgent(agentId: string, dryRun: boolean): Promise<MigrationResult> {
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

  if (agent.systemType === 'openai-realtime') {
    console.log(`  ⏭️  Agent ${agent.name} is already on OpenAI Realtime`)
    return {
      agentId: agent.id,
      agentName: agent.name,
      projectId: agent.projectId,
      projectName: agent.project.name,
      phoneNumbers: [],
      success: true,
    }
  }

  console.log(`\n📋 Migrating agent: ${agent.name} (${agent.id})`)
  console.log(`   Project: ${agent.project.name}`)
  console.log(`   Phone numbers: ${agent.project.numbers.length}`)

  const result: MigrationResult = {
    agentId: agent.id,
    agentName: agent.name,
    projectId: agent.projectId,
    projectName: agent.project.name,
    phoneNumbers: [],
    success: true,
  }

  // Initialize Twilio client if needed
  let twilioClient: twilio.Twilio | null = null
  if (agent.project.numbers.length > 0) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set to configure phone numbers')
    }
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  }

  // Migrate phone numbers
  for (const phoneNumber of agent.project.numbers) {
    try {
      console.log(`  📞 Migrating phone number: ${phoneNumber.e164}`)

      if (dryRun) {
        console.log(`     [DRY RUN] Would update systemType to 'openai-realtime'`)
        if (twilioClient) {
          console.log(`     [DRY RUN] Would configure Twilio number to point to ${OPENAI_REALTIME_SERVER_URL}/twilio/voice`)
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
        data: { systemType: 'openai-realtime' },
      })

      // Configure Twilio number
      if (twilioClient) {
        await configureTwilioNumber(phoneNumber.e164, twilioClient)
      }

      result.phoneNumbers.push({
        e164: phoneNumber.e164,
        label: phoneNumber.label,
        success: true,
      })
    } catch (error: any) {
      console.error(`     ❌ Error migrating phone number ${phoneNumber.e164}:`, error.message)
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
      data: { systemType: 'openai-realtime' },
    })

    // Log migration
    await prisma.eventLog.create({
      data: {
        projectId: agent.projectId,
        type: 'migration.to_openai_realtime',
        payload: {
          agentId: agent.id,
          phoneNumbersMigrated: result.phoneNumbers.length,
          phoneNumbersSuccess: result.phoneNumbers.filter(p => p.success).length,
        },
      },
    })
  } else {
    console.log(`  [DRY RUN] Would update agent systemType to 'openai-realtime'`)
  }

  console.log(`  ✅ Agent migration ${dryRun ? 'preview' : 'complete'}`)
  return result
}

async function main() {
  const args = process.argv.slice(2)
  const agentIdIndex = args.indexOf('--agent-id')
  const projectIdIndex = args.indexOf('--project-id')
  const allIndex = args.indexOf('--all')
  const dryRun = args.includes('--dry-run')

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be applied\n')
  }

  let agentsToMigrate: string[] = []

  if (agentIdIndex !== -1 && args[agentIdIndex + 1]) {
    // Migrate specific agent
    agentsToMigrate = [args[agentIdIndex + 1]]
  } else if (projectIdIndex !== -1 && args[projectIdIndex + 1]) {
    // Migrate all agents for a project
    const projectId = args[projectIdIndex + 1]
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        agents: {
          where: { deletedAt: null, systemType: { not: 'openai-realtime' } },
        },
      },
    })

    if (!project) {
      console.error(`❌ Project not found: ${projectId}`)
      process.exit(1)
    }

    if (project.agents.length === 0) {
      console.log(`✅ No agents to migrate for project ${project.name}`)
      process.exit(0)
    }

    agentsToMigrate = project.agents.map(a => a.id)
    console.log(`📋 Found ${agentsToMigrate.length} agent(s) to migrate for project: ${project.name}\n`)
  } else if (allIndex !== -1) {
    // Migrate all Vapi agents
    const agents = await prisma.agent.findMany({
      where: {
        deletedAt: null,
        systemType: { not: 'openai-realtime' },
      },
    })

    if (agents.length === 0) {
      console.log('✅ No agents to migrate')
      process.exit(0)
    }

    agentsToMigrate = agents.map(a => a.id)
    console.log(`⚠️  WARNING: This will migrate ${agentsToMigrate.length} agent(s)\n`)
    
    if (!dryRun) {
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  } else {
    console.error('Usage:')
    console.error('  tsx scripts/migrate-to-openai-realtime.ts --agent-id <agent-id>')
    console.error('  tsx scripts/migrate-to-openai-realtime.ts --project-id <project-id>')
    console.error('  tsx scripts/migrate-to-openai-realtime.ts --all')
    console.error('  Add --dry-run to preview changes without applying')
    process.exit(1)
  }

  const results: MigrationResult[] = []

  for (const agentId of agentsToMigrate) {
    try {
      const result = await migrateAgent(agentId, dryRun)
      results.push(result)
    } catch (error: any) {
      console.error(`❌ Error migrating agent ${agentId}:`, error.message)
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
  console.log('MIGRATION SUMMARY')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalPhones = results.reduce((sum, r) => sum + r.phoneNumbers.length, 0)
  const successfulPhones = results.reduce((sum, r) => sum + r.phoneNumbers.filter(p => p.success).length, 0)

  console.log(`Agents migrated: ${successful}/${results.length} successful, ${failed} failed`)
  console.log(`Phone numbers configured: ${successfulPhones}/${totalPhones} successful`)

  if (dryRun) {
    console.log('\n⚠️  This was a DRY RUN - no changes were applied')
    console.log('Run without --dry-run to apply changes')
  }

  if (failed > 0) {
    console.log('\n❌ Some migrations failed. Review errors above.')
    process.exit(1)
  } else {
    console.log('\n✅ All migrations completed successfully!')
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
