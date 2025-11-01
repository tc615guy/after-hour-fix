import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const latest = await prisma.eventLog.findFirst({
      where: { projectId, type: 'knowledge.faqs.updated' },
      orderBy: { createdAt: 'desc' },
    })
    const faqs = (latest?.payload as any)?.faqs || []
    const snippetsLatest = await prisma.eventLog.findFirst({
      where: { projectId, type: 'knowledge.snippets.updated' },
      orderBy: { createdAt: 'desc' },
    })
    const snippets = (snippetsLatest?.payload as any)?.snippets || []
    return NextResponse.json({ faqs, snippets })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load knowledge' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body = await req.json()
    const { faqs, snippets } = body

    if (faqs) {
      await prisma.eventLog.create({
        data: { projectId, type: 'knowledge.faqs.updated', payload: { faqs } },
      })
    }
    if (snippets) {
      await prisma.eventLog.create({
        data: { projectId, type: 'knowledge.snippets.updated', payload: { snippets } },
      })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save knowledge' }, { status: 500 })
  }
}

