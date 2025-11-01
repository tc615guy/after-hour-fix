import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createPortingRequest } from '@/lib/porting'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const body = await req.json()
    const required = ['number', 'carrier', 'businessName', 'contact']
    for (const k of required) if (!body[k]) return NextResponse.json({ error: `Missing ${k}` }, { status: 400 })

    // Create provider request
    const provider = await createPortingRequest(body)
    await prisma.eventLog.create({
      data: {
        projectId,
        type: 'porting.request',
        payload: { ...body, providerRequestId: provider.id },
      },
    })

    return NextResponse.json({ status: 'submitted', focDate: null, providerRequestId: provider.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to submit port request' }, { status: 500 })
  }
}
