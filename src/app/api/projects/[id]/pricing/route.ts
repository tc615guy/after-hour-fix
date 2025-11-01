import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body = await req.json()

    const { pricingSheet, emergencyMultiplier } = body

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        pricingSheet,
        emergencyMultiplier,
      },
    })

    return NextResponse.json({ success: true, project })
  } catch (error: any) {
    console.error('[Pricing] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update pricing' },
      { status: 500 }
    )
  }
}
