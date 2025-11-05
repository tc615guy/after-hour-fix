import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL,
    },
  },
})

async function main() {
  console.log('🔍 Checking Cal.com slots for Big Al\'s Plumbing...\n')
  
  try {
    // Find Big Al's Plumbing project
    const project = await prisma.project.findFirst({
      where: {
        name: {
          contains: 'Big Al',
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        calcomApiKey: true,
        calcomUser: true,
        calcomEventTypeId: true,
        timezone: true,
        businessHours: true,
      },
    })

    if (!project) {
      console.log('❌ Big Al\'s Plumbing not found')
      return
    }

    console.log(`✅ Found: ${project.name}`)
    console.log(`   Project ID: ${project.id}`)
    console.log(`   Cal.com User: ${project.calcomUser || 'NOT SET'}`)
    console.log(`   Event Type ID: ${project.calcomEventTypeId || 'NOT SET'}`)
    console.log(`   Timezone: ${project.timezone}\n`)

    if (!project.calcomApiKey || !project.calcomUser) {
      console.log('❌ Cal.com not connected (missing API key or user)')
      return
    }

    if (!project.calcomEventTypeId) {
      console.log('⚠️  No Event Type ID configured')
    }

    // Calculate tomorrow's date range
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(8, 0, 0, 0) // Start at 8 AM

    const endDate = new Date(tomorrow)
    endDate.setHours(17, 0, 0, 0) // End at 5 PM

    const startIso = tomorrow.toISOString()
    const endIso = endDate.toISOString()

    console.log(`📅 Checking availability for tomorrow:`)
    console.log(`   Start: ${tomorrow.toLocaleString('en-US', { timeZone: project.timezone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`)
    console.log(`   End: ${endDate.toLocaleString('en-US', { timeZone: project.timezone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`)
    console.log(`   ISO: ${startIso} to ${endIso}\n`)

    // Try v2 API first
    if (project.calcomEventTypeId) {
      console.log('🌐 Calling Cal.com v2 API...\n')
      try {
        const slotsUrl = new URL('https://api.cal.com/v2/slots/available')
        slotsUrl.searchParams.set('eventTypeId', String(project.calcomEventTypeId))
        slotsUrl.searchParams.set('startTime', startIso)
        slotsUrl.searchParams.set('endTime', endIso)
        
        console.log(`   URL: ${slotsUrl.toString()}\n`)
        
        const resp = await fetch(slotsUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${project.calcomApiKey}`,
            'cal-api-version': '2024-08-12',
            'Content-Type': 'application/json',
          },
        })

        console.log(`   Status: ${resp.status} ${resp.statusText}`)

        if (resp.ok) {
          const data = await resp.json()
          console.log(`\n📦 Raw Cal.com Response:`)
          console.log(JSON.stringify(data, null, 2))

          // Parse slots
          const daySlots = data?.data?.slots || {}
          const allSlots: Array<{ start: string; end?: string }> = []
          
          for (const dateKey in daySlots) {
            const slotsForDay = daySlots[dateKey] || []
            console.log(`\n📅 ${dateKey}: ${slotsForDay.length} slots`)
            for (const slot of slotsForDay) {
              const st = slot?.time || slot?.start
              if (st) {
                const slotDate = new Date(st)
                const formatted = slotDate.toLocaleString('en-US', {
                  timeZone: project.timezone,
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })
                console.log(`   - ${formatted} (${st})`)
                allSlots.push({ start: st, end: slot?.end || null })
              }
            }
          }

          console.log(`\n✅ Total slots from Cal.com: ${allSlots.length}`)
          
          if (allSlots.length === 0) {
            console.log('\n⚠️  WARNING: No slots returned from Cal.com!')
            console.log('   This could mean:')
            console.log('   - Event type is not configured correctly')
            console.log('   - Availability settings in Cal.com are too restrictive')
            console.log('   - Date range is outside configured availability')
          }

        } else {
          const errorText = await resp.text()
          console.log(`\n❌ Cal.com API Error:`)
          console.log(errorText)
        }
      } catch (v2Error: any) {
        console.log(`\n❌ Error calling Cal.com v2 API:`)
        console.log(v2Error.message)
      }
    } else {
      console.log('⚠️  Cannot check v2 API - no Event Type ID')
    }

    // Also test our internal availability endpoint
    console.log(`\n` + '='.repeat(60))
    console.log(`🧪 Testing internal availability endpoint...\n`)
    
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const url = `${appUrl}/api/calcom/availability?projectId=${project.id}&start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`
      
      console.log(`   URL: ${url}\n`)
      
      const res = await fetch(url)
      const data = await res.json()
      
      console.log(`   Status: ${res.status} ${res.statusText}\n`)
      console.log(`📦 Internal API Response:`)
      console.log(JSON.stringify(data, null, 2))
      
      if (data.slots && Array.isArray(data.slots)) {
        console.log(`\n📋 Parsed Available Slots (${data.slots.length}):`)
        data.slots.forEach((slot: any, index: number) => {
          const slotDate = new Date(slot.start)
          const formatted = slotDate.toLocaleString('en-US', {
            timeZone: project.timezone,
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
          console.log(`   ${index + 1}. ${formatted}`)
        })
        
        if (data.result) {
          console.log(`\n💬 AI Message:`)
          console.log(`   ${data.result}`)
        }
      }
    } catch (internalError: any) {
      console.log(`\n❌ Error calling internal API:`)
      console.log(internalError.message)
      console.log(`\n   Note: If running this script outside the Next.js server,`)
      console.log(`   you may need to set NEXT_PUBLIC_APP_URL in your .env file`)
    }

    console.log('\n')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
