import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { requireSession, rateLimit, captureException, getOrCreatePrismaUserByEmail } from '@/lib/api-guard'
import { createCalComClient, createCalComClientWithToken } from '@/lib/calcom'
import { createVapiClient, buildAssistantPrompt, buildAssistantTools } from '@/lib/vapi'

const CreateProjectSchema = z.object({
  name: z.string(),
  trade: z.string(),
  plan: z.string().default('Starter'),
  timezone: z.string(),
  calcomApiKey: z.string().optional(),
  calcomUser: z.string().optional(),
  ownerPhone: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `projects:POST:${ip}`, 20, 60)
    const session = await requireSession(req)
    const prismaUser = await getOrCreatePrismaUserByEmail(session!.user.email, (session!.user as any).user_metadata?.name)
    const body = await req.json()
    const input = CreateProjectSchema.parse(body)

    const userId = prismaUser.id

    // Normalize ownerPhone to E.164 if present
    let ownerPhoneE164: string | undefined = input.ownerPhone
    if (ownerPhoneE164) {
      const digits = ownerPhoneE164.replace(/\D/g, '')
      if (digits.length === 10) ownerPhoneE164 = `+1${digits}`
      else if (digits.length === 11 && digits.startsWith('1')) ownerPhoneE164 = `+${digits}`
    }

    const project = await prisma.project.create({
      data: {
        ownerId: userId,
        name: input.name,
        trade: input.trade,
        plan: input.plan,
        timezone: input.timezone,
        ownerPhone: ownerPhoneE164,
        calcomApiKey: input.calcomApiKey,
        calcomUser: input.calcomUser,
        // Seed default business hours
        businessHours: {
          mon: { enabled: true, open: '08:00', close: '17:00' },
          tue: { enabled: true, open: '08:00', close: '17:00' },
          wed: { enabled: true, open: '08:00', close: '17:00' },
          thu: { enabled: true, open: '08:00', close: '17:00' },
          fri: { enabled: true, open: '08:00', close: '17:00' },
          sat: { enabled: false, open: '08:00', close: '17:00' },
          sun: { enabled: false, open: '08:00', close: '17:00' },
        },
        holidays: [],
      },
    })

    // If base eventType id exists for trade, clone it.
    try {
      const trade = (project.trade || '').toLowerCase()
      const baseIdMap: Record<string, number | undefined> = {
        plumbing: process.env.CALCOM_EVENT_TYPE_ID_PLUMBING ? Number(process.env.CALCOM_EVENT_TYPE_ID_PLUMBING) : undefined,
        hvac: process.env.CALCOM_EVENT_TYPE_ID_HVAC ? Number(process.env.CALCOM_EVENT_TYPE_ID_HVAC) : undefined,
        electrical: process.env.CALCOM_EVENT_TYPE_ID_ELECTRICAL ? Number(process.env.CALCOM_EVENT_TYPE_ID_ELECTRICAL) : undefined,
      }
      const baseId = baseIdMap[trade]
      if (baseId) {
        // Prefer customer's OAuth token if already connected
        if ((project as any).calcomAccessToken) {
          const tokenClient = createCalComClientWithToken((project as any).calcomAccessToken)
          // Fetch base settings with service key, then create under customer's token
          const serviceKey = process.env.CALCOM_API_KEY
          if (serviceKey) {
            const service = createCalComClient(serviceKey)
            const base = await service.getEventType(baseId)
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
            const created = await (tokenClient as any).client.post('/event-types', payload, { headers: { Authorization: `Bearer ${(project as any).calcomAccessToken}` } })
            const evtId = created.data?.event_type?.id || created.data?.id
            await prisma.project.update({ where: { id: project.id }, data: { calcomEventTypeId: evtId, calcomConnectedAt: new Date() } })
          }
        } else {
          // Fallback to service key clone under our account
          const apiKey = process.env.CALCOM_API_KEY
          if (apiKey) {
            const cal = createCalComClient(apiKey)
            const evt = await cal.createEventTypeFromBase({ baseEventTypeId: baseId, projectName: project.name, trade })
            await prisma.project.update({ where: { id: project.id }, data: { calcomEventTypeId: evt.id, calcomConnectedAt: new Date(), calcomApiKey: apiKey } })
          }
        }
      }
    } catch (e) {
      console.warn('[Cal.com] clone event type skipped:', (e as any)?.message)
    }

    // Create VAPI assistant automatically
    try {
      const vapiClient = createVapiClient()
      const systemPrompt = buildAssistantPrompt(project.name, project.trade)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
      const tools = buildAssistantTools(appUrl, project.id)

      console.log('[VAPI] Creating assistant for project:', project.name)

      const vapiAssistant = await vapiClient.createAssistant({
        name: `${project.name} AI Assistant`,
        firstMessage: "Hey there, thanks for calling! I can help you right away. What's going on?",
        voice: {
          provider: 'cartesia',
          voiceId: 'ec1e269e-9ca0-402f-8a18-58e0e022355a', // Ariana
          model: 'sonic-3',
          language: 'en',
        },
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
          ],
          tools,
        },
        recordingEnabled: true,
      })

      console.log('[VAPI] Assistant created:', vapiAssistant.id)

      // Create agent record in database
      const agent = await prisma.agent.create({
        data: {
          projectId: project.id,
          vapiAssistantId: vapiAssistant.id,
          name: `${project.name} AI Assistant`,
          voice: 'ariana',
          basePrompt: systemPrompt,
        },
      })

      console.log('[VAPI] Agent record created in database:', agent.id)

      await prisma.eventLog.create({
        data: {
          projectId: project.id,
          type: 'agent.created',
          payload: { agentId: agent.id, vapiAssistantId: vapiAssistant.id },
        },
      })
    } catch (e) {
      console.error('[VAPI] Failed to create assistant:', (e as any)?.message)
      // Don't fail the whole request if VAPI creation fails
    }

    return NextResponse.json({ success: true, project })
  } catch (error: any) {
    captureException(error)
    console.error('Create project error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `projects:GET:${ip}`, 60, 60)
    const session = await requireSession(req)
    const prismaUser = await getOrCreatePrismaUserByEmail(session!.user.email, (session!.user as any).user_metadata?.name)
    const isAdmin = (await prisma.user.findUnique({ where: { id: prismaUser.id } }))?.role === 'admin'
    const projects = await prisma.project.findMany({
      where: isAdmin ? { deletedAt: null } : { ownerId: prismaUser.id, deletedAt: null },
      include: {
        agents: true,
        numbers: true,
        _count: {
          select: {
            calls: true,
            bookings: true,
          },
        },
      },
    })

    return NextResponse.json({ projects })
  } catch (error: any) {
    captureException(error)
    console.error('Get projects error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
