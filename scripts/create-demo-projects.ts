#!/usr/bin/env tsx

/**
 * Create Demo HVAC and Demo Electrical Projects
 *
 * This script will:
 * 1. Create projects in the database
 * 2. Connect them to Cal.com with trade-specific templates
 * 3. Link existing Vapi assistants to the projects
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import { createEventTypePayload } from '../src/lib/trade-templates'

const prisma = new PrismaClient()
const CALCOM_BASE_URL = 'https://api.cal.com/v1'

// You'll need to provide your Cal.com API key
const CALCOM_API_KEY = process.env.CALCOM_API_KEY

// Existing Vapi assistant IDs
const VAPI_ASSISTANTS = {
  hvac: 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f',
  electrical: 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5',
}

interface DemoProject {
  name: string
  trade: 'hvac' | 'electrical'
  vapiAssistantId: string
}

const DEMO_PROJECTS: DemoProject[] = [
  {
    name: 'Demo HVAC',
    trade: 'hvac',
    vapiAssistantId: VAPI_ASSISTANTS.hvac,
  },
  {
    name: 'Demo Electrical',
    trade: 'electrical',
    vapiAssistantId: VAPI_ASSISTANTS.electrical,
  },
]

async function createProjectWithCalcom(demo: DemoProject) {
  console.log(`\n📋 Creating: ${demo.name} (${demo.trade.toUpperCase()})`)

  try {
    // Step 1: Get the demo user (same owner as Demo Plumbing)
    const demoUser = await prisma.user.findUnique({
      where: { email: 'demo@example.com' },
    })

    if (!demoUser) {
      throw new Error('Demo user not found. Please ensure demo@example.com exists.')
    }

    // Step 2: Create project in database
    console.log('   Creating project in database...')
    const project = await prisma.project.create({
      data: {
        id: `demo-${demo.trade}`,
        name: demo.name,
        trade: demo.trade,
        timezone: 'America/Chicago',
        ownerPhone: '+15555555555', // Placeholder
        ownerId: demoUser.id,
      },
    })
    console.log(`   ✓ Project created: ${project.id}`)

    if (!CALCOM_API_KEY) {
      console.log('   ⚠️  No CALCOM_API_KEY found - skipping Cal.com setup')
      console.log('   You can connect Cal.com later through the dashboard')
      return project
    }

    // Step 2: Get Cal.com user info
    console.log('   Fetching Cal.com user info...')
    const userResponse = await axios.get(`${CALCOM_BASE_URL}/me`, {
      params: { apiKey: CALCOM_API_KEY },
    })

    const calcomUserRaw = userResponse.data
    const calcomUser = calcomUserRaw?.user ?? calcomUserRaw
    const userId = typeof calcomUser.id === 'string' ? parseInt(calcomUser.id, 10) : calcomUser.id
    const defaultScheduleId = calcomUser?.defaultScheduleId

    console.log(`   ✓ Found user: ${calcomUser.username} (ID: ${userId})`)

    // Step 3: Get schedules
    console.log('   Fetching schedules...')
    const schedulesResponse = await axios.get(`${CALCOM_BASE_URL}/schedules`, {
      params: { apiKey: CALCOM_API_KEY },
    })

    const schedulesRaw = schedulesResponse.data
    const schedules = schedulesRaw?.schedules ?? schedulesRaw ?? []
    const defaultSchedule =
      schedules.find((s: any) => s.isDefault) ||
      schedules.find((s: any) => s.id === defaultScheduleId) ||
      schedules[0]

    console.log(`   ✓ Using schedule: ${defaultSchedule.name || 'Default'} (ID: ${defaultSchedule.id})`)

    // Step 4: Create Cal.com event type with trade-specific template
    console.log(`   Creating Cal.com event type with ${demo.trade.toUpperCase()} template...`)

    const eventTypePayload = createEventTypePayload(
      demo.name,
      demo.trade,
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
        params: { apiKey: CALCOM_API_KEY },
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const eventType = eventTypeResponse.data.event_type

    console.log(`   ✓ Event type created!`)
    console.log(`     - ID: ${eventType.id}`)
    console.log(`     - Title: ${eventType.title}`)
    console.log(`     - Slug: ${eventType.slug}`)

    // Step 5: Update project with Cal.com info
    console.log('   Updating project with Cal.com info...')
    await prisma.project.update({
      where: { id: project.id },
      data: {
        calcomApiKey: CALCOM_API_KEY,
        calcomUser: calcomUser.username,
        calcomUserId: calcomUser.id,
        calcomEventTypeId: eventType.id,
        calcomConnectedAt: new Date(),
      },
    })

    console.log(`   ✅ ${demo.name} - Complete!`)

    return project

  } catch (error: any) {
    console.error(`   ❌ Failed to create ${demo.name}:`)
    console.error(`      ${error.response?.data?.message || error.message}`)
    if (error.response?.data) {
      console.error(`      Details:`, error.response.data)
    }
    throw error
  }
}

async function linkVapiAssistant(projectId: string, vapiAssistantId: string, projectName: string) {
  console.log(`\n🔗 Linking Vapi assistant to ${projectName}...`)

  try {
    // Check if agent already exists
    const existingAgent = await prisma.agent.findFirst({
      where: { vapiAssistantId: vapiAssistantId },
    })

    if (existingAgent) {
      console.log(`   ✓ Agent already exists - updating project link`)
      await prisma.agent.update({
        where: { id: existingAgent.id },
        data: { projectId },
      })
    } else {
      console.log(`   Creating new agent record...`)
      await prisma.agent.create({
        data: {
          projectId,
          vapiAssistantId: vapiAssistantId,
          name: `${projectName} AI`,
          voice: 'ariana',
          basePrompt: 'AI receptionist for trade services',
        },
      })
    }

    console.log(`   ✓ Vapi assistant linked to project`)

  } catch (error: any) {
    console.error(`   ⚠️  Failed to link Vapi assistant: ${error.message}`)
  }
}

async function main() {
  console.log('🚀 Creating Demo HVAC and Demo Electrical Projects\n')

  if (!CALCOM_API_KEY) {
    console.log('⚠️  WARNING: CALCOM_API_KEY not found in .env file')
    console.log('   Projects will be created without Cal.com connection')
    console.log('   You can connect Cal.com later through the dashboard\n')
  }

  try {
    for (const demo of DEMO_PROJECTS) {
      const project = await createProjectWithCalcom(demo)

      // Link Vapi assistant to project
      await linkVapiAssistant(project.id, demo.vapiAssistantId, demo.name)
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n🎉 All done!\n')
    console.log('Summary:')
    console.log('  ✓ Created Demo HVAC project with 90-min appointments')
    console.log('  ✓ Created Demo Electrical project with 60-min appointments')
    console.log('  ✓ Linked Vapi assistants to projects')
    console.log('  ✓ Set up Cal.com event types with trade-specific templates')
    console.log('\nNext steps:')
    console.log('  1. Check Cal.com dashboard to see new event types')
    console.log('  2. Test booking flow with each assistant')
    console.log('  3. View dashboards at:')
    console.log('     - http://localhost:3001/projects/demo-hvac/settings')
    console.log('     - http://localhost:3001/projects/demo-electrical/settings')
    console.log('')

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
