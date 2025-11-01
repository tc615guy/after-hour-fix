import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const ps: any = project.pricingSheet || {}
    return NextResponse.json({
      templates: Array.isArray(ps.responseTemplates) ? ps.responseTemplates : [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load templates' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const templates = Array.isArray(body?.templates) ? body.templates : []
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const ps: any = project.pricingSheet || {}
    const newSheet = { ...ps, responseTemplates: templates }
    await prisma.project.update({ where: { id }, data: { pricingSheet: newSheet as any } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save templates' }, { status: 500 })
  }
}

