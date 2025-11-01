#!/usr/bin/env tsx

/**
 * Recreate Cal.com Event Types with Trade-Specific Templates
 *
 * This script will:
 * 1. Find all projects with Cal.com connected
 * 2. Delete their old event types
 * 3. Create new event types using trade-specific templates
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import { createEventTypePayload } from '../src/lib/trade-templates'

const prisma = new PrismaClient()
const CALCOM_BASE_URL = 'https://api.cal.com/v1'

interface Project {
  id: string
  name: string
  trade: string
  calcomApiKey: string | null
  calcomEventTypeId: number | null
  calcomUserId: string | null
}

async function recreateEventType(project: Project) {
  if (!project.calcomApiKey) {
    console.log(`⚠️  Skipping ${project.name} - No Cal.com API key found`)
    return
  }

  console.log(`\n📋 Processing: ${project.name} (${project.trade.toUpperCase()})`)
  console.log(`   Project ID: ${project.id}`)

  const apiKey = project.calcomApiKey

  try {
    // Step 1: Get user info to find schedules
    console.log('   Fetching Cal.com user info...')
    const userResponse = await axios.get(`${CALCOM_BASE_URL}/me`, {
      params: { apiKey },
    })

    const calcomUserRaw = userResponse.data
    const calcomUser = calcomUserRaw?.user ?? calcomUserRaw
    const userId = typeof calcomUser.id === 'string' ? parseInt(calcomUser.id, 10) : calcomUser.id
    const defaultScheduleId = calcomUser?.defaultScheduleId

    console.log(`   ✓ Found user: ${calcomUser.username} (ID: ${userId})`)

    // Step 2: Get schedules
    console.log('   Fetching schedules...')
    const schedulesResponse = await axios.get(`${CALCOM_BASE_URL}/schedules`, {
      params: { apiKey },
    })

    const schedulesRaw = schedulesResponse.data
    const schedules = schedulesRaw?.schedules ?? schedulesRaw ?? []
    const defaultSchedule =
      schedules.find((s: any) => s.isDefault) ||
      schedules.find((s: any) => s.id === defaultScheduleId) ||
      schedules[0]

    if (!defaultSchedule) {
      console.log(`   ⚠️  No schedule found - skipping`)
      return
    }

    console.log(`   ✓ Using schedule: ${defaultSchedule.name || 'Default'} (ID: ${defaultSchedule.id})`)

    // Step 3: Delete old event type if it exists
    if (project.calcomEventTypeId) {
      console.log(`   Deleting old event type (ID: ${project.calcomEventTypeId})...`)
      try {
        await axios.delete(`${CALCOM_BASE_URL}/event-types/${project.calcomEventTypeId}`, {
          params: { apiKey },
        })
        console.log(`   ✓ Old event type deleted`)
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log(`   ⚠️  Old event type not found (already deleted?)`)
        } else {
          console.log(`   ⚠️  Failed to delete old event type: ${error.message}`)
        }
      }
    }

    // Step 4: Create new event type with trade-specific template
    console.log(`   Creating new event type with ${project.trade.toUpperCase()} template...`)

    const eventTypePayload = createEventTypePayload(
      project.name,
      project.trade,
      userId,
      defaultSchedule.id
    )

    console.log(`   Template settings:`)
    console.log(`     - Duration: ${eventTypePayload.length} minutes`)
    console.log(`     - After buffer: ${eventTypePayload.afterEventBuffer} minutes`)
    console.log(`     - Slot interval: ${eventTypePayload.slotInterval || 'default'} minutes`)

    const eventTypeResponse = await axios.post(
      `${CALCOM_BASE_URL}/event-types`,
      eventTypePayload,
      {
        params: { apiKey },
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const eventType = eventTypeResponse.data.event_type

    console.log(`   ✓ New event type created!`)
    console.log(`     - ID: ${eventType.id}`)
    console.log(`     - Title: ${eventType.title}`)
    console.log(`     - Slug: ${eventType.slug}`)

    // Step 5: Update project with new event type ID
    console.log(`   Updating project in database...`)
    await prisma.project.update({
      where: { id: project.id },
      data: {
        calcomEventTypeId: eventType.id,
      },
    })

    console.log(`   ✅ ${project.name} - Complete!`)

  } catch (error: any) {
    console.error(`   ❌ Failed to recreate event type for ${project.name}:`)
    console.error(`      ${error.response?.data?.message || error.message}`)
    if (error.response?.data) {
      console.error(`      Details:`, error.response.data)
    }
  }
}

async function main() {
  console.log('🚀 Recreating Cal.com Event Types with Trade Templates\n')

  try {
    // Find all projects with Cal.com connected
    const projects = await prisma.project.findMany({
      where: {
        calcomApiKey: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        trade: true,
        calcomApiKey: true,
        calcomEventTypeId: true,
        calcomUserId: true,
      },
    })

    if (projects.length === 0) {
      console.log('⚠️  No projects found with Cal.com connected')
      await prisma.$disconnect()
      return
    }

    console.log(`Found ${projects.length} project(s) with Cal.com connected:\n`)
    projects.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.trade})`)
    })

    console.log('\n' + '='.repeat(60))

    // Process each project
    for (const project of projects) {
      await recreateEventType(project as Project)
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n🎉 All done!\n')
    console.log('Summary:')
    console.log('  - Deleted old event types with generic settings')
    console.log('  - Created new event types with trade-specific templates')
    console.log('  - Updated project records with new event type IDs')
    console.log('\nNext steps:')
    console.log('  - Check Cal.com dashboard to verify new event types')
    console.log('  - Test booking flow with AI assistant')
    console.log('')

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
