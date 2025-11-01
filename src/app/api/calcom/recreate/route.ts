import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSession, ensureProjectAccess } from '@/lib/api-guard'
import { createCalComClient, createCalComClientWithToken } from '@/lib/calcom'

function baseIdForTrade(trade?: string | null): number | undefined {
  const t = (trade || '').toLowerCase()
  if (t === 'plumbing') return process.env.CALCOM_EVENT_TYPE_ID_PLUMBING ? Number(process.env.CALCOM_EVENT_TYPE_ID_PLUMBING) : undefined
  if (t === 'hvac') return process.env.CALCOM_EVENT_TYPE_ID_HVAC ? Number(process.env.CALCOM_EVENT_TYPE_ID_HVAC) : undefined
  if (t === 'electrical') return process.env.CALCOM_EVENT_TYPE_ID_ELECTRICAL ? Number(process.env.CALCOM_EVENT_TYPE_ID_ELECTRICAL) : undefined
  return undefined
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const { projectId } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    await ensureProjectAccess(session!.user.email || '', projectId)

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const baseId = baseIdForTrade(project.trade)
    if (!baseId) return NextResponse.json({ error: 'Base event type id not configured for trade' }, { status: 400 })

    // Prefer customer's OAuth token if connected
    if (project.calcomAccessToken) {
      // Fetch base settings with service key, then create under customer's token
      const serviceKey = process.env.CALCOM_API_KEY
      if (!serviceKey) return NextResponse.json({ error: 'Service CALCOM_API_KEY not configured' }, { status: 500 })
      const service = createCalComClient(serviceKey)
      const base = await service.getEventType(baseId)

      const tokenClient = createCalComClientWithToken(project.calcomAccessToken as unknown as string)
      // Get default schedule for this user
      const me = await tokenClient.getMe()
      const schedules = await tokenClient.listSchedules()
      const schedule = schedules.find((s: any) => s.isDefault) || schedules[0]
      const payload: any = {
        title: `${project.name} - ${String(project.trade || '').toUpperCase()} Service`,
        slug: `${String(project.trade || 'service').toLowerCase()}-service-${Date.now()}`,
        length: base.length,
        description: base.description,
        minimumBookingNotice: base.minimumBookingNotice ?? 0,
        beforeEventBuffer: base.beforeEventBuffer ?? 0,
        afterEventBuffer: base.afterEventBuffer ?? 0,
        slotInterval: base.slotInterval ?? 30,
        hosts: schedule
          ? [{ userId: typeof me.id === 'string' ? parseInt(me.id as any, 10) : me.id, scheduleId: schedule.id, isFixed: true }]
          : undefined,
      }
      const created = await (tokenClient as any).client.post('/event-types', payload, { headers: { Authorization: `Bearer ${project.calcomAccessToken}` } })
      const evtId = created.data?.event_type?.id || created.data?.id
      await prisma.project.update({ where: { id: project.id }, data: { calcomEventTypeId: evtId, calcomConnectedAt: new Date() } })
      return NextResponse.json({ success: true, eventTypeId: evtId })
    }

    // Fallback to service API key clone under our account
    const apiKey = process.env.CALCOM_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'CALCOM_API_KEY not configured' }, { status: 500 })
    const cal = createCalComClient(apiKey)
    const evt = await cal.createEventTypeFromBase({ baseEventTypeId: baseId, projectName: project.name, trade: project.trade })
    await prisma.project.update({ where: { id: project.id }, data: { calcomEventTypeId: evt.id, calcomConnectedAt: new Date(), calcomApiKey: apiKey } })
    
    return NextResponse.json({ success: true, eventTypeId: evt.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to recreate event type' }, { status: 500 })
  }
}
