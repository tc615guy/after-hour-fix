import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const pricingSheet: any = project.pricingSheet || {}
    const items = Array.isArray(pricingSheet.items) ? pricingSheet.items : []

    const rows: string[] = []
    rows.push(['Service', 'Description', 'Base Price', 'Unit'].join(','))

    for (const item of items) {
      const service = (item.service || '').toString().replace(/"/g, '""')
      const description = (item.description || '').toString().replace(/"/g, '""')
      const basePrice = Number(item.basePrice || 0).toFixed(2)
      const unit = (item.unit || 'flat').toString()
      rows.push([
        `"${service}"`,
        `"${description}"`,
        basePrice,
        unit,
      ].join(','))
    }

    // Optional footer rows
    if (typeof pricingSheet.tripFee === 'number') {
      rows.push('')
      rows.push(`# Trip Fee,$${Number(pricingSheet.tripFee).toFixed(2)}`)
    }

    if (typeof project.emergencyMultiplier === 'number') {
      rows.push(`# Emergency Multiplier,${project.emergencyMultiplier}x`)
    }

    const csv = rows.join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pricing-${projectId}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('[Pricing CSV Export] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to export pricing' },
      { status: 500 }
    )
  }
}

