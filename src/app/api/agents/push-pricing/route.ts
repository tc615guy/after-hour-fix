import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
export const runtime = 'nodejs'

/**
 * Push pricing updates to OpenAI Realtime assistant
 * Stores pricing data in agent.basePrompt for use by realtime agent
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = z.object({ projectId: z.string().min(1) }).parse(await req.json())

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const agent = await prisma.agent.findFirst({ where: { projectId }, orderBy: { updatedAt: 'desc' } })
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    // Build pricing block for OpenAI Realtime assistant
    let pricingBlock = '\n\n---\nPRICING & SERVICES (INTERNAL REFERENCE)\n'
    const ps: any = project.pricingSheet
    if (ps && ps.enabled !== false) {
      if (ps.tripFee && ps.tripFee > 0) {
        pricingBlock += `Trip Fee: $${Number(ps.tripFee).toFixed(2)}\n`
      }
      if (Array.isArray(ps.items) && ps.items.length > 0) {
        pricingBlock += 'Services (examples):\n'
        const max = Math.min(25, ps.items.length)
        for (let i = 0; i < max; i++) {
          const it = ps.items[i]
          const price = typeof it.basePrice === 'number' ? `$${it.basePrice.toFixed(2)}` : ''
          const unit = it.unit === 'hourly' ? ' /hour' : it.unit === 'per_unit' ? ' each' : ''
          const desc = it.description ? ` - ${String(it.description).slice(0, 120)}` : ''
          pricingBlock += `- ${it.service}: ${price}${unit}${desc}\n`
        }
        if (ps.items.length > max) pricingBlock += `... and ${ps.items.length - max} more\n`
      }
      if ((project as any).emergencyMultiplier && (project as any).emergencyMultiplier > 1) {
        pricingBlock += `After-hours/Emergency: ${(project as any).emergencyMultiplier}x standard rates\n`
      }
      if (ps.notes) {
        pricingBlock += `Notes: ${String(ps.notes).slice(0, 300)}\n`
      }
    } else {
      pricingBlock += 'No detailed pricing provided. Speak generally about pricing and offer on-site quote.\n'
    }

    // Build a compact response guide the model should follow verbatim
    const tripFeeVal = (ps && typeof ps.tripFee === 'number' ? Number(ps.tripFee) : 0)
    const emergencyX = (project as any).emergencyMultiplier || 1.5
    const firstItem = Array.isArray(ps?.items) && ps!.items.length > 0 ? ps!.items[0] : null
    const firstSvcName = firstItem?.service || 'a common service'
    const firstSvcPrice = typeof firstItem?.basePrice === 'number' ? firstItem!.basePrice : undefined

    // Build response guide from saved templates if present; else generate default
    const tmplArr: any[] = Array.isArray(ps?.responseTemplates) ? ps!.responseTemplates : []
    function fillPlaceholders(t: string): string {
      return t
        .replaceAll('[TRIP_FEE]', tripFeeVal > 0 ? tripFeeVal.toFixed(2) : '0.00')
        .replaceAll('[EMERGENCY_MULTIPLIER]', String(emergencyX))
        .replaceAll('[SERVICE_NAME]', firstSvcName)
        .replaceAll('[BASE_PRICE]', firstSvcPrice !== undefined ? firstSvcPrice.toFixed(2) : '0.00')
    }

    let responseGuide = '\n\n--- RESPONSE GUIDE (MANDATORY) v1 ---\n'
    responseGuide += '- STRICT RULE: If the customer asks about cost, price, fee, rate, estimate, quote, trip fee, service price, or says "how much", ALWAYS call get_pricing first before answering. No exceptions.\n'
    responseGuide += '- After calling get_pricing, keep replies 1–2 sentences and fill values from the returned pricing.\n'
    responseGuide += '- NEVER invent specific dollar amounts that are not in pricing; if you do not have an exact figure, use a brief example from the sheet and offer to book.\n'
    responseGuide += '- For scheduling: call get_slots (next few days) and offer the nearest 2–3 open options; once caller confirms one, IMMEDIATELY call book_slot.\n'
    if (tmplArr.length > 0) {
      for (const t of tmplArr) {
        if (typeof t?.template === 'string') {
          responseGuide += fillPlaceholders(t.template) + '\n'
        }
      }
    } else {
      // Defaults similar to UI examples
      if (tripFeeVal > 0) {
        responseGuide += `"We charge a $${tripFeeVal.toFixed(2)} trip fee to come out and assess. Final price depends on parts and labor, and you'll get a quote before any work. Want to book?"\n`
      } else {
        responseGuide += '"Pricing depends on the exact service and parts. Our tech will assess and give a quote before any work. Want to book?"\n'
      }
      if (firstSvcPrice !== undefined) {
        responseGuide += `"For ${firstSvcName}, it typically runs around $${firstSvcPrice.toFixed(2)}${tripFeeVal>0?` plus the $${tripFeeVal.toFixed(2)} trip fee`:''}. The tech will confirm an exact quote on site. Want to book?"\n`
      }
      responseGuide += `"Emergency rates are ${emergencyX}x standard${tripFeeVal>0?`, with a $${tripFeeVal.toFixed(2)} trip fee`:''} and priority response. I can dispatch now—proceed?"\n`
      responseGuide += `"After‑hours rates are ${emergencyX}x standard${tripFeeVal>0?`, including the $${tripFeeVal.toFixed(2)} trip fee`:''}. We can come tonight or schedule tomorrow at standard rates—what works?"\n`
    }
    responseGuide += '\n--- END RESPONSE GUIDE ---\n'

    const combined = `${pricingBlock}${responseGuide}`

    // Idempotency: skip if unchanged
    if (agent.basePrompt && agent.basePrompt === combined) {
      await prisma.eventLog.create({ data: { projectId, type: 'agent.pricing_pushed.skipped', payload: { reason: 'no_change' } } })
      return NextResponse.json({ success: true, skipped: true })
    }

    // Store pricing in agent.basePrompt for OpenAI Realtime agent to use
    // The realtime agent will append this to the system prompt when connecting
    await prisma.agent.update({ where: { id: agent.id }, data: { basePrompt: combined } })

    await prisma.eventLog.create({
      data: { projectId, type: 'agent.pricing_pushed', payload: { agentId: agent.id, target: 'openai_realtime' } },
    })

    console.log('[Push Pricing] Updated agent basePrompt for OpenAI Realtime:', { agentId: agent.id, projectId, pricingLength: combined.length })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const details = error?.response?.data || error?.message
    console.error('Push pricing error:', details)
    return NextResponse.json({ error: typeof details === 'string' ? details : JSON.stringify(details) }, { status: 500 })
  }
}
