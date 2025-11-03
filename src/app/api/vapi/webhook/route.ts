import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { createVapiClient } from '@/lib/vapi'

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const arrayBuf = await req.arrayBuffer()
    const rawBody = Buffer.from(arrayBuf)
    
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET
    const skipVerification = process.env.SKIP_WEBHOOK_VERIFICATION === 'true'
    
    if (webhookSecret && !skipVerification) {
      const headersList = headers()
      const signature = headersList.get('x-vapi-signature')
      
      if (!signature) {
        console.error('Vapi webhook signature missing')
        return NextResponse.json({ error: 'No signature' }, { status: 401 })
      }
      
      try {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(rawBody)
          .digest('hex')
        
        if (signature !== expectedSignature) {
          console.error('Vapi webhook signature verification failed')
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
      } catch (err: any) {
        console.error('Vapi webhook signature verification error:', err.message)
        return NextResponse.json({ error: 'Verification failed' }, { status: 401 })
      }
    }
    
    // Parse payload after verification
    const payload = JSON.parse(rawBody.toString())
    const { type, call, message } = payload

    console.log('Vapi webhook received:', type, payload)

    switch (type) {
      case 'assistant-request': {
        // Don't override - let the assistant use its configured model
        // The assistant is already configured with OpenAI gpt-4o-mini which has better function calling
        return NextResponse.json({ success: true })
      }

      case 'status-update': {
        if (!call?.id) break

        // Find agent by vapiAssistantId from call metadata
        const agent = call.assistantId
          ? await prisma.agent.findFirst({ where: { vapiAssistantId: call.assistantId } })
          : null

        const projectId = agent?.projectId || null

        // Minutes cap enforcement (Starter=500, Pro=1200)
        try {
          if (projectId && (call.status === 'in-progress' || call.status === 'ringing')) {
            const project = await prisma.project.findUnique({
              where: { id: projectId },
              include: { owner: true, agents: { select: { minutesThisPeriod: true } } },
            })
            if (project && project.owner) {
              // Test account whitelist - bypass all paywall checks
              const TEST_ACCOUNTS = ['joshlanius@yahoo.com']
              const isTestAccount = TEST_ACCOUNTS.includes(project.owner.email)

              // Membership gating: if membership is OFF, transfer immediately and skip AI handling
              if (!isTestAccount && project.membershipActive === false) {
                const number = project.forwardingNumber
                const existing = await prisma.eventLog.findFirst({ where: { type: 'membership.suspended', payload: { path: ['callId'], equals: call.id } as any } })
                if (!existing) {
                  await prisma.eventLog.create({ data: { projectId, type: 'membership.suspended', payload: { callId: call.id } } })
                }
                if (number) {
                  const vapi = createVapiClient()
                  try {
                    await vapi.transferCall(call.id, number)
                    await prisma.eventLog.create({ data: { projectId, type: 'call.forwarded_membership_off', payload: { callId: call.id, to: number } } })
                  } catch (e: any) {
                    await prisma.eventLog.create({ data: { projectId, type: 'call.forward_failed_membership_off', payload: { callId: call.id, error: e?.message || 'transfer failed' } } })
                  }
                }
              }
              const subs = await prisma.subscription.findFirst({
                where: { userId: project.ownerId, status: { in: ['active', 'trialing'] } },
                orderBy: { updatedAt: 'desc' },
              })
              const proId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
              const cap = subs && proId && subs.priceId === proId ? 1200 : 500
              const used = (project.agents || []).reduce((s, a) => s + (a.minutesThisPeriod || 0), 0)
              if (!isTestAccount && used >= cap) {
                // Attempt to forward regardless of business hours
                const number = project.forwardingNumber
                const existing = await prisma.eventLog.findFirst({ where: { type: 'minutes.cap_reached', payload: { path: ['callId'], equals: call.id } as any } })
                if (!existing) {
                  await prisma.eventLog.create({ data: { projectId, type: 'minutes.cap_reached', payload: { callId: call.id, used, cap } } })
                }
                if (number) {
                  const vapi = createVapiClient()
                  try {
                    await vapi.transferCall(call.id, number)
                    await prisma.eventLog.create({ data: { projectId, type: 'call.forwarded_over_cap', payload: { callId: call.id, to: number } } })
                  } catch (e: any) {
                    await prisma.eventLog.create({ data: { projectId, type: 'call.forward_failed_over_cap', payload: { callId: call.id, error: e?.message || 'transfer failed' } } })
                  }
                }
                // Do not break; continue to upsert call status so logs remain consistent
              }
            }
          }
        } catch (capErr) {
          console.warn('[CAP] enforcement error', (capErr as any)?.message)
        }

        await prisma.call.upsert({
          where: { vapiCallId: call.id },
          create: {
            vapiCallId: call.id,
            projectId: projectId || 'unknown',
            agentId: agent?.id,
            direction: call.type || 'inbound',
            fromNumber: call.customer?.number || 'unknown',
            toNumber: call.phoneNumber?.number || 'unknown',
            status: call.status || 'in-progress',
            durationSec: call.duration,
          },
          update: {
            status: call.status || 'in-progress',
            durationSec: call.duration,
          },
        })

        // Update agent minutes if completed
        if (call.status === 'ended' && call.duration && agent) {
          const minutes = Math.ceil(call.duration / 60)
          console.log(`[Webhook] Updating agent ${agent.id} minutes: +${minutes} (total will be ${(agent.minutesThisPeriod || 0) + minutes})`)
          const updated = await prisma.agent.update({
            where: { id: agent.id },
            data: { minutesThisPeriod: { increment: minutes } },
          })
          console.log(`[Webhook] Agent ${agent.id} minutes updated to ${updated.minutesThisPeriod}`)

          // Overage usage reporting (post-increment)
          try {
            if (agent.projectId) {
              const project = await prisma.project.findUnique({
                where: { id: agent.projectId },
                include: { owner: true, agents: { select: { minutesThisPeriod: true } } },
              })
              const sub = project?.owner
                ? await prisma.subscription.findFirst({
                    where: { userId: project.ownerId, status: { in: ['active', 'trialing'] } },
                    orderBy: { updatedAt: 'desc' },
                  })
                : null
              const proId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
              const cap = sub && proId && sub.priceId === proId ? 1200 : 500
              const used = (project?.agents || []).reduce((s, a) => s + (a.minutesThisPeriod || 0), 0)
              const overage = Math.max(0, used - cap)
              const overagePrice = process.env.STRIPE_PRICE_OVERAGE_MINUTE
              if (overage > 0 && sub?.stripeSubId && overagePrice && project?.allowOverage) {
                // Sum already-reported overage since last reset
                const lastReset = await prisma.eventLog.findFirst({
                  where: {
                    type: 'minutes.reset',
                    payload: { path: ['stripeSubId'], equals: sub.stripeSubId } as any,
                  },
                  orderBy: { createdAt: 'desc' },
                })
                const usageLogs = await prisma.eventLog.findMany({
                  where: {
                    type: 'minutes.usage_report',
                    createdAt: lastReset ? { gt: lastReset.createdAt } : undefined,
                    payload: { path: ['stripeSubId'], equals: sub.stripeSubId } as any,
                  },
                })
                const reported = usageLogs.reduce((s, ev: any) => s + (Number(ev.payload?.quantity) || 0), 0)
                const delta = overage - reported
                if (delta > 0) {
                  // Find or create subscription item for overage price
                  const s = await (await import('@/lib/stripe')).stripe.subscriptions.retrieve(sub.stripeSubId)
                  const item = s.items.data.find((it) => it.price.id === overagePrice)
                  if (item) {
                    await (await import('@/lib/stripe')).stripe.subscriptionItems.createUsageRecord(item.id, {
                      quantity: delta,
                      timestamp: Math.floor(Date.now() / 1000),
                      action: 'increment',
                    })
                    await prisma.eventLog.create({
                      data: {
                        type: 'minutes.usage_report',
                        payload: { stripeSubId: sub.stripeSubId, quantity: delta },
                      },
                    })
                  }
                }
              }

              // Threshold email alerts (80% and 100%), once per period
              try {
                const pct = cap > 0 ? used / cap : 0
                const toEmail = project?.notificationsEmail || project?.owner?.email
                if (toEmail) {
                  if (pct >= 0.8 && !project?.minutesAlert80Sent) {
                    await prisma.project.update({ where: { id: project!.id }, data: { minutesAlert80Sent: true } })
                    try {
                      const { sendEmailAsync } = await import('@/lib/email')
                      await sendEmailAsync({ to: toEmail, subject: "You've used 80% of your minutes", html: `<p>Usage: ${used}/${cap} minutes.</p>` })
                    } catch {}
                  }
                  if (pct >= 1 && !project?.minutesAlert100Sent) {
                    await prisma.project.update({ where: { id: project!.id }, data: { minutesAlert100Sent: true } })
                    try {
                      const { sendEmailAsync } = await import('@/lib/email')
                      const msg = project?.allowOverage ? 'Extra usage is enabled at $0.10/min.' : 'Extra usage is disabled; calls may be forwarded or blocked.'
                      await sendEmailAsync({ to: toEmail, subject: 'Plan minutes reached', html: `<p>${msg} (${used}/${cap} minutes)</p>` })
                    } catch {}
                  }
                }
              } catch (e:any) {
                console.warn('[Minutes Alerts] error', e?.message)
              }
            }
          } catch (uerr) {
            console.warn('[Overage] usage report failed', (uerr as any)?.message)
          }
        }

        await prisma.eventLog.create({
          data: {
            projectId,
            type: 'vapi.status_update',
            payload: { callId: call.id, status: call.status },
          },
        })

        // Forwarding outside AI Agent Hours: if enabled and out-of-hours, attempt a transfer once
        try {
          if (projectId) {
            const project = await prisma.project.findUnique({ where: { id: projectId } })
            const number = project?.forwardingNumber
            const enabled = project?.forwardingEnabled
            if (enabled && number && (call.status === 'in-progress' || call.status === 'ringing')) {
              // Business Hours check in project timezone
              const bh: any = project?.businessHours || {}
              const days = ['sun','mon','tue','wed','thu','fri','sat']
              const tz = project?.timezone || 'UTC'
              const now = new Date()
              const fmtTime = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' })
              const tparts = fmtTime.formatToParts(now)
              const hh = Number(tparts.find(p=>p.type==='hour')?.value || '0')
              const mm = Number(tparts.find(p=>p.type==='minute')?.value || '0')
              const nowMin = hh*60+mm
              const fmtDow = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' })
              const wd = fmtDow.format(now).toLowerCase().slice(0,3) // sun, mon, ...
              const dkey = wd as any
              const dayCfg = bh[dkey]
              let inHours = false
              if (dayCfg && dayCfg.enabled) {
                const [oh, om] = String(dayCfg.open||'00:00').split(':').map((x: string)=>parseInt(x,10))
                const [ch, cm] = String(dayCfg.close||'23:59').split(':').map((x: string)=>parseInt(x,10))
                const startMin = (oh||0)*60 + (om||0)
                const endMin = (ch||0)*60 + (cm||0)
                inHours = nowMin >= startMin && nowMin <= endMin
              }
              const aiAllDay = Boolean(dayCfg?.aiAllDay)
              if (inHours && !aiAllDay) {
                const existing = await prisma.eventLog.findFirst({ where: { type: 'call.forwarded', payload: { path: ['callId'], equals: call.id } as any } })
                if (!existing) {
                  const vapi = createVapiClient()
                  try {
                    await vapi.transferCall(call.id, number)
                    await prisma.eventLog.create({ data: { projectId, type: 'call.forwarded', payload: { callId: call.id, to: number } } })
                  } catch (e: any) {
                    // log but do not crash webhook
                    await prisma.eventLog.create({ data: { projectId, type: 'call.forward_failed', payload: { callId: call.id, error: e?.message || 'transfer failed' } } })
                  }
                }
              }
            }
          }
        } catch (fwdErr) {
          console.warn('[Forwarding] error', (fwdErr as any)?.message)
        }
        break
      }

      case 'transcript': {
        if (!call?.id || !message?.transcript) break

        await prisma.call.updateMany({
          where: { vapiCallId: call.id },
          data: { transcript: message.transcript },
        })
        break
      }

      case 'function-call': {
        // Tool invocation from assistant
        const { functionCall } = message || {}
        if (!functionCall) break

        console.log('Vapi function call:', functionCall.name, functionCall.parameters)

        // These are handled by the specific tool endpoints (/api/book, /api/notify)
        // This webhook just logs them
        await prisma.eventLog.create({
          data: {
            type: `vapi.function_call.${functionCall.name}`,
            payload: functionCall,
          },
        })
        break
      }

      case 'end-of-call-report': {
        if (!call?.id) break

        const summary = message?.summary || ''
        const transcript = message?.transcript || call.transcript || ''
        const recordingUrl = call.recordingUrl || message?.recordingUrl || null

        // Calculate voiceConfidence score from Vapi metadata or analyze transcript
        let voiceConfidence = call.analysis?.confidence || message?.confidence || 1.0

        // Detect panic/distress markers
        const panicDetected = /(help|emergency|dying|blood|hurt|danger|panic)/i.test(transcript)
        if (panicDetected) {
          voiceConfidence = Math.min(0.4, voiceConfidence) // Force low confidence for panic
        }

        // Lower confidence if transcript has confusion markers
        if (/(what|huh|sorry|understand|repeat|didn't|catch that)/i.test(transcript)) {
          voiceConfidence = Math.max(0.5, voiceConfidence - 0.25)
        }

        // Check for multiple clarifications (indicates low understanding)
        const clarificationCount = (transcript.match(/(could you|can you repeat|say that again)/gi) || []).length
        if (clarificationCount > 2) {
          voiceConfidence = Math.max(0.45, voiceConfidence - 0.3)
        }

        // Detect if escalate_owner tool was called
        let escalated = call.metadata?.escalated || false
        let escalationReason = call.metadata?.escalationReason || null

        // Detect intent from transcript
        let intent = 'quote'
        if (/(emergency|urgent|asap|now|leak|flood|locked out|stranded|no heat|won't start)/i.test(transcript)) {
          intent = 'emergency'
        } else if (/(call.*back|leave.*message|later)/i.test(transcript)) {
          intent = 'callback'
        }

        // Get project settings for confidence threshold
        const agent = call.assistantId
          ? await prisma.agent.findFirst({
              where: { vapiAssistantId: call.assistantId },
              include: { project: true }
            })
          : null

        const project = agent?.project

        // Determine if should escalate based on confidence threshold
        const confidenceThreshold = project?.confidenceThreshold || 0.65
        const autoForwardEnabled = project?.autoForwardEnabled ?? true

        if (voiceConfidence < confidenceThreshold && !escalated && autoForwardEnabled) {
          escalated = true
          escalationReason = 'low_confidence'
        } else if (panicDetected && !escalated) {
          escalated = true
          escalationReason = 'panic_detected'
        }

        // Ensure call record exists then update
        if (agent?.project) {
          await prisma.call.upsert({
            where: { vapiCallId: call.id },
            create: {
              vapiCallId: call.id,
              projectId: agent.project.id,
              agentId: agent.id,
              direction: call.type || 'inbound',
              fromNumber: call.customer?.number || 'unknown',
              toNumber: call.phoneNumber?.number || 'unknown',
              status: 'completed',
              durationSec: call.duration,
              transcript,
              recordingUrl,
              voiceConfidence,
              escalated,
              escalationReason,
            },
            update: {
              transcript,
              intent,
              status: 'completed',
              recordingUrl,
              voiceConfidence,
              escalated,
              escalationReason,
              durationSec: call.duration,
            },
          })
        } else {
          // Fallback: update if exists
          await prisma.call.updateMany({
            where: { vapiCallId: call.id },
            data: {
              transcript,
              intent,
              status: 'completed',
              recordingUrl,
              voiceConfidence,
              escalated,
              escalationReason,
              durationSec: call.duration,
            },
          })
        }

        // Handle escalation: notify owner and forward call if needed
        if (escalated && project) {
          const callRecord = await prisma.call.findFirst({
            where: { vapiCallId: call.id },
            include: { project: { include: { owner: true } } },
          })

          if (callRecord) {
            const confidencePercent = (voiceConfidence * 100).toFixed(0)
            const escalationMsg = escalationReason === 'panic_detected'
              ? `🚨 PANIC DETECTED: Call from ${callRecord.fromNumber} needs immediate attention!`
              : `⚠️ Low confidence call (${confidencePercent}%) from ${callRecord.fromNumber}. Review needed.`

            // Send notification to owner
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'escalate',
                to: callRecord.project.owner.email,
                message: escalationMsg,
                reason: escalationReason,
                customerPhone: callRecord.fromNumber,
                recordingUrl,
                transcript: transcript.substring(0, 500), // First 500 chars
              }),
            })

            // If owner phone is set, trigger call forwarding via Vapi
            if (project.ownerPhone && escalationReason === 'panic_detected') {
              // TODO: Implement Vapi call forwarding
              console.log(`[ESCALATION] Would forward ${callRecord.fromNumber} to ${project.ownerPhone}`)
            }
          }
        }

        // DISABLED: Booking fallback auto-created bookings without confirmation
        // This caused unconfirmed bookings to be created, leading to double-booking and scheduling conflicts.
        // All bookings should now go through the proper book_slot API with confirm=true validation.
        // try {
        //   if (project) {
        //     const wantsBooking = /(book|schedule|appointment)/i.test(transcript)
        //     if (wantsBooking) {
        //       ...auto-creation logic removed...
        //     }
        //   }
        // } catch (e: any) {
        //   console.warn('[BOOK-FALLBACK] auto-create failed:', e.message)
        // }

        // Auto-capture first high-quality call as demo recording
        if (recordingUrl && voiceConfidence >= 0.85 && !escalated && agent) {
          const hasDemo = agent.demoRecordingUrl !== null
          const callRecord = await prisma.call.findFirst({
            where: { vapiCallId: call.id },
            include: { bookings: true },
          })

          // If no demo yet and call resulted in booking, set as demo
          if (!hasDemo && callRecord && callRecord.bookings.length > 0) {
            // Upload to Supabase storage (optional - can skip if Vapi URL is stable)
            // const publicUrl = await downloadAndUploadRecording(recordingUrl, agent.projectId, callRecord.id)

            await prisma.agent.update({
              where: { id: agent.id },
              data: { demoRecordingUrl: recordingUrl },
            })

            await prisma.call.updateMany({
              where: { id: callRecord.id },
              data: { isDemo: true },
            })

            console.log(`[DEMO] Auto-captured first quality call as demo for agent ${agent.id}`)

            await prisma.eventLog.create({
              data: {
                type: 'demo.captured',
                projectId: agent.projectId,
                payload: {
                  agentId: agent.id,
                  callId: callRecord.id,
                  recordingUrl,
                  confidence: voiceConfidence,
                },
              },
            })
          }
        }

        await prisma.eventLog.create({
          data: {
            type: 'vapi.end_of_call',
            payload: {
              callId: call.id,
              summary,
              intent,
              voiceConfidence,
              escalated,
              escalationReason,
              panicDetected,
            },
          },
        })
        break
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Vapi webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
