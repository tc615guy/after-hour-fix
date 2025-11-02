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

    // Cal.com integration: Only create event type if customer has already connected their account
    // No fallback to service key - customers must provide their own Cal.com API key
    try {
      if ((project as any).calcomAccessToken) {
        const trade = (project.trade || '').toLowerCase()
        const baseIdMap: Record<string, number | undefined> = {
          plumbing: process.env.CALCOM_EVENT_TYPE_ID_PLUMBING ? Number(process.env.CALCOM_EVENT_TYPE_ID_PLUMBING) : undefined,
          hvac: process.env.CALCOM_EVENT_TYPE_ID_HVAC ? Number(process.env.CALCOM_EVENT_TYPE_ID_HVAC) : undefined,
          electrical: process.env.CALCOM_EVENT_TYPE_ID_ELECTRICAL ? Number(process.env.CALCOM_EVENT_TYPE_ID_ELECTRICAL) : undefined,
        }
        const baseId = baseIdMap[trade]

        if (baseId) {
          const tokenClient = createCalComClientWithToken((project as any).calcomAccessToken)
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

            console.log('[Cal.com] Event type created for customer account:', evtId)
          }
        }
      } else {
        console.log('[Cal.com] Skipping event type creation - customer has not connected Cal.com account yet')
      }
    } catch (e) {
      console.warn('[Cal.com] Event type creation failed:', (e as any)?.message)
    }

    // Create VAPI assistant by cloning from demo assistant based on trade
    try {
      const vapiClient = createVapiClient()
      const systemPrompt = buildAssistantPrompt(project.name, project.trade)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
      const tools = buildAssistantTools(appUrl, project.id)

      // Map trade to demo assistant ID
      const DEMO_ASSISTANTS: Record<string, string> = {
        'Electrical': 'fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5',
        'HVAC': 'ee143a79-7d18-451f-ae8e-c1e78c83fa0f',
        'Plumbing': '6d0cbda1-0b1d-4d24-bcc9-dfab156b5fbb',
      }

      const trade = input.trade || 'Plumbing'
      const demoAssistantId = DEMO_ASSISTANTS[trade]

      console.log('[VAPI] Creating assistant for project:', project.name, 'trade:', trade)

      if (demoAssistantId) {
        // Fetch the demo assistant to get its configuration
        console.log('[VAPI] Fetching demo assistant config:', demoAssistantId)
        const demoAssistant = await vapiClient.getAssistant(demoAssistantId)

        // Create new assistant with demo's settings but custom prompt/tools
        const vapiAssistant = await vapiClient.createAssistant({
          name: `${project.name} AI Assistant`,
          firstMessage: demoAssistant.firstMessage || "Hey there, thanks for calling! I can help you right away. What's going on?",
          voice: demoAssistant.voice,
          model: {
            ...demoAssistant.model,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
            ],
            tools,
          },
          recordingEnabled: demoAssistant.recordingEnabled ?? true,
        })

        console.log('[VAPI] Assistant created from demo template:', vapiAssistant.id)

        // Create agent record in database
        const agent = await prisma.agent.create({
          data: {
            projectId: project.id,
            vapiAssistantId: vapiAssistant.id,
            name: `${project.name} AI Assistant`,
            voice: demoAssistant.voice?.voiceId || 'ariana',
            basePrompt: systemPrompt,
          },
        })

        console.log('[VAPI] Agent record created in database:', agent.id)

        await prisma.eventLog.create({
          data: {
            projectId: project.id,
            type: 'agent.created',
            payload: { agentId: agent.id, vapiAssistantId: vapiAssistant.id, clonedFrom: demoAssistantId },
          },
        })
      } else {
        console.warn('[VAPI] No demo assistant found for trade:', trade)
      }
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
