#!/usr/bin/env tsx

/**
 * Migration Status Checker
 * 
 * This script checks the migration status of agents and phone numbers,
 * showing which are on Vapi vs OpenAI Realtime.
 * 
 * Usage:
 *   # Check all agents
 *   tsx scripts/check-migration-status.ts
 * 
 *   # Check specific project
 *   tsx scripts/check-migration-status.ts --project-id <project-id>
 * 
 *   # Show only agents that need migration
 *   tsx scripts/check-migration-status.ts --vapi-only
 */

import 'dotenv/config'
import { prisma } from '../src/lib/db'

async function main() {
  const args = process.argv.slice(2)
  const projectIdIndex = args.indexOf('--project-id')
  const vapiOnly = args.includes('--vapi-only')

  const projectId = projectIdIndex !== -1 ? args[projectIdIndex + 1] : undefined

  const whereClause: any = {
    deletedAt: null,
  }

  if (projectId) {
    whereClause.projectId = projectId
  }

  const agents = await prisma.agent.findMany({
    where: whereClause,
    include: {
      project: {
        include: {
          numbers: {
            where: { deletedAt: null },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (agents.length === 0) {
    console.log('No agents found.')
    process.exit(0)
  }

  // Filter by system type if requested
  const filteredAgents = vapiOnly
    ? agents.filter(a => (a.systemType || 'vapi') === 'vapi')
    : agents

  if (filteredAgents.length === 0) {
    console.log(vapiOnly ? 'No Vapi agents found.' : 'No agents found.')
    process.exit(0)
  }

  console.log('\n' + '='.repeat(80))
  console.log('MIGRATION STATUS')
  console.log('='.repeat(80))
  console.log()

  const stats = {
    vapi: 0,
    openaiRealtime: 0,
    totalPhones: 0,
    vapiPhones: 0,
    openaiPhones: 0,
  }

  for (const agent of filteredAgents) {
    const systemType = agent.systemType || 'vapi'
    const icon = systemType === 'openai-realtime' ? '🤖' : '📞'
    const statusColor = systemType === 'openai-realtime' ? '🟢' : '🟡'

    console.log(`${icon} ${statusColor} Agent: ${agent.name}`)
    console.log(`   ID: ${agent.id}`)
    console.log(`   Project: ${agent.project.name}`)
    console.log(`   System: ${systemType}`)
    console.log(`   Phone Numbers: ${agent.project.numbers.length}`)

    if (systemType === 'openai-realtime') {
      stats.openaiRealtime++
    } else {
      stats.vapi++
    }

    if (agent.project.numbers.length > 0) {
      for (const number of agent.project.numbers) {
        const phoneSystemType = number.systemType || 'vapi'
        const phoneIcon = phoneSystemType === 'openai-realtime' ? '🤖' : '📞'
        const phoneStatus = phoneSystemType === systemType ? '✅' : '⚠️'

        console.log(`   ${phoneIcon} ${phoneStatus} ${number.e164} (${number.label || 'Main'}) - ${phoneSystemType}`)

        stats.totalPhones++
        if (phoneSystemType === 'openai-realtime') {
          stats.openaiPhones++
        } else {
          stats.vapiPhones++
        }

        // Warn if mismatch
        if (phoneSystemType !== systemType) {
          console.log(`      ⚠️  WARNING: Phone number system type doesn't match agent!`)
        }
      }
    } else {
      console.log(`   ⚠️  No phone numbers configured`)
    }

    console.log()
  }

  // Summary
  console.log('='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log(`Total Agents: ${filteredAgents.length}`)
  console.log(`  📞 Vapi: ${stats.vapi}`)
  console.log(`  🤖 OpenAI Realtime: ${stats.openaiRealtime}`)
  console.log()
  console.log(`Total Phone Numbers: ${stats.totalPhones}`)
  console.log(`  📞 Vapi: ${stats.vapiPhones}`)
  console.log(`  🤖 OpenAI Realtime: ${stats.openaiPhones}`)
  console.log()

  // Recommendations
  if (stats.vapi > 0) {
    console.log('📋 RECOMMENDATIONS:')
    console.log('  To migrate Vapi agents to OpenAI Realtime:')
    console.log('    tsx scripts/migrate-to-openai-realtime.ts --project-id <project-id> --dry-run')
    console.log()
  }

  // Check for mismatches
  const mismatches = filteredAgents.filter(agent => {
    const agentSystemType = agent.systemType || 'vapi'
    return agent.project.numbers.some(
      num => (num.systemType || 'vapi') !== agentSystemType
    )
  })

  if (mismatches.length > 0) {
    console.log('⚠️  WARNINGS:')
    console.log(`  ${mismatches.length} agent(s) have phone numbers with mismatched system types!`)
    console.log('  Run migration scripts to fix this.')
    console.log()
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
