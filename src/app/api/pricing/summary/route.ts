import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * POST /api/pricing/summary
 * Body: { projectId: string, limit?: number }
 * Returns: short text summary of pricing suitable for AI to read aloud
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, limit } = z.object({ projectId: z.string().min(1), limit: z.number().int().min(1).max(50).optional() }).parse(await req.json())

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const pricingSheet: any = project.pricingSheet || {}
    const items = Array.isArray(pricingSheet.items) ? pricingSheet.items : []
    const top = Math.max(0, Math.min(Number(limit) || 6, items.length))

    const parts: string[] = []

    if (typeof pricingSheet.tripFee === 'number' && pricingSheet.tripFee > 0) {
      parts.push(`Trip fee is $${Number(pricingSheet.tripFee).toFixed(2)}.`)
    }

    if (top > 0) {
      const sample = items.slice(0, top).map((i: any) => {
        const price = typeof i.basePrice === 'number' ? `$${i.basePrice.toFixed(2)}` : 'varies'
        const unit = i.unit === 'hourly' ? ' per hour' : i.unit === 'per_unit' ? ' each' : ''
        return `${i.service} — ${price}${unit}`
      })
      parts.push(`Common services: ${sample.join('; ')}.`)
    }

    if (typeof project.emergencyMultiplier === 'number' && project.emergencyMultiplier > 1) {
      parts.push(`After-hours/emergency is ${project.emergencyMultiplier}x standard rates.`)
    }

    if (pricingSheet.notes) {
      parts.push(`${pricingSheet.notes}`)
    }

    const summary = parts.join(' ')

    return NextResponse.json({
      success: true,
      project: { id: project.id, name: project.name, trade: project.trade },
      summary,
    })
  } catch (error: any) {
    console.error('[Pricing Summary] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
