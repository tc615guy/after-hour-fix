#!/usr/bin/env tsx
/**
 * Apply canonical Cal.com defaults to event types per trade.
 * - Uses each project's `calcomApiKey` and `calcomEventTypeId`
 * - Updates event type with general defaults and per-trade overrides
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import axios from 'axios'

const prisma = new PrismaClient()
const BASE = process.env.CALCOM_BASE_URL || 'https://api.cal.com/v1'

type Trade = 'plumbing' | 'hvac' | 'electrical' | string

const TRADE_DEFAULTS: Record<string, { length: number; afterEventBuffer: number; maxPerDay: number }> = {
  plumbing: { length: 75, afterEventBuffer: 20, maxPerDay: 8 },
  hvac: { length: 90, afterEventBuffer: 30, maxPerDay: 7 },
  electrical: { length: 60, afterEventBuffer: 20, maxPerDay: 10 },
}

function buildPayload(projectName: string, trade: Trade) {
  const t = (trade || 'plumbing').toLowerCase() as Trade
  const base = TRADE_DEFAULTS[t] || TRADE_DEFAULTS['plumbing']
  const descMap: Record<string, string> = {
    plumbing: 'Professional plumbing service appointment. Our licensed plumbers handle repairs, installations, drain cleaning, water heaters, and emergency plumbing.',
    hvac: 'Certified HVAC service appointment. Heating/cooling diagnostics, maintenance, installations, and emergency service.',
    electrical: 'Licensed electrical service appointment. Wiring, panels, outlets/lighting, and emergency repairs.',
  }
  const description = descMap[t] || descMap['plumbing']

  // Cal.com v1 event-type known fields
  const payload: any = {
    title: `${projectName} - ${t.toUpperCase()} Service`,
    description,
    length: base.length,
    minimumBookingNotice: 0,
    beforeEventBuffer: 0,
    afterEventBuffer: base.afterEventBuffer,
    slotInterval: 30,
    // Rolling booking window: 14 days
    periodType: 'ROLLING',
    periodDays: 14,
    // Prevent double-booking / single attendee
    seatsPerTimeSlot: 1,
  }
  return payload
}

async function updateEventType(apiKey: string, eventTypeId: number, payload: any) {
  const client = axios.create({ baseURL: BASE, headers: { 'Content-Type': 'application/json' } })
  const { data } = await client.patch(`/event-types/${eventTypeId}`, payload, { params: { apiKey } })
  return data
}

async function main() {
  const projects = await prisma.project.findMany({
    where: { calcomApiKey: { not: null }, calcomEventTypeId: { not: null } },
    select: { id: true, name: true, trade: true, calcomApiKey: true, calcomEventTypeId: true },
  })
  if (projects.length === 0) {
    console.log('No projects with Cal.com connected + event type id found.')
    return
  }
  console.log(`Updating ${projects.length} event type(s) with canonical defaults...`)
  for (const p of projects) {
    const apiKey = p.calcomApiKey as string
    const evtId = p.calcomEventTypeId as number
    try {
      const payload = buildPayload(p.name, (p.trade || '').toLowerCase())
      await updateEventType(apiKey, evtId, payload)
      console.log(`✓ Updated ${p.name} (trade=${p.trade}) eventTypeId=${evtId}`)
    } catch (e: any) {
      console.warn(`! Failed to update ${p.name} (eventTypeId=${evtId}):`, e?.response?.data || e?.message)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())



