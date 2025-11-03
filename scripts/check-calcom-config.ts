#!/usr/bin/env tsx

/**
 * Check Cal.com configuration for Josh's Heating and Cooling project
 */

import { prisma } from '@/lib/db'
import 'dotenv/config'

const JOSH_PROJECT_ID = 'cmhi8al3a0001l504q942hc16'

async function checkCalComConfig() {
  try {
    console.log('🔍 Checking Cal.com Configuration\n')
    console.log('='.repeat(70))

    const project = await prisma.project.findUnique({
      where: { id: JOSH_PROJECT_ID },
      select: {
        id: true,
        name: true,
        calcomApiKey: true,
        calcomUser: true,
        calcomUserId: true,
        calcomEventTypeId: true,
        calcomConnectedAt: true,
        calcomAccessToken: true,
        calcomRefreshToken: true,
        calcomTokenExpiry: true,
      },
    })

    if (!project) {
      console.error('❌ Project not found!')
      return
    }

    console.log(`\n📋 Project: ${project.name}`)
    console.log(`   ID: ${project.id}`)
    console.log('\n🔗 Cal.com Connection Status:\n')

    const hasApiKey = !!project.calcomApiKey
    const hasAccessToken = !!project.calcomAccessToken
    const hasUser = !!project.calcomUser
    const hasEventType = !!project.calcomEventTypeId
    const isConnected = !!project.calcomConnectedAt

    console.log(`   API Key:        ${hasApiKey ? '✅ Configured' : '❌ Missing'}`)
    console.log(`   Access Token:   ${hasAccessToken ? '✅ Configured' : '❌ Missing'}`)
    console.log(`   Cal.com User:   ${hasUser ? `✅ ${project.calcomUser}` : '❌ Missing'}`)
    console.log(`   Event Type ID:  ${hasEventType ? `✅ ${project.calcomEventTypeId}` : '❌ Missing'}`)
    console.log(`   Connected At:   ${isConnected ? `✅ ${project.calcomConnectedAt?.toISOString()}` : '❌ Never'}`)

    if (project.calcomTokenExpiry) {
      const isExpired = new Date() > project.calcomTokenExpiry
      console.log(`   Token Expiry:   ${isExpired ? '⚠️  EXPIRED' : '✅ Valid'} (${project.calcomTokenExpiry.toISOString()})`)
    }

    console.log('\n' + '='.repeat(70))

    if (!hasApiKey && !hasAccessToken) {
      console.log('\n❌ ISSUE: No Cal.com authentication configured!')
      console.log('\nTo fix, you need to either:')
      console.log('1. Set up OAuth connection (recommended)')
      console.log('2. Manually configure API key and event type ID')
      console.log('\nWithout Cal.com connection, the AI cannot check real availability or create bookings.')
    } else if (!hasEventType) {
      console.log('\n⚠️  WARNING: Cal.com is connected but no Event Type ID configured!')
      console.log('The AI needs an event type to create bookings.')
    } else {
      console.log('\n✅ Cal.com is properly configured!')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkCalComConfig()
