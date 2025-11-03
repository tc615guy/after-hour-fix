import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

function normalizeProjectId(req: NextRequest, bodyProjectId?: string) {
  const url = new URL(req.url)
  return (
    bodyProjectId ||
    req.headers.get('x-project-id') ||
    url.searchParams.get('projectId') ||
    undefined
  )
}

async function getPricing(projectId?: string) {
  if (!projectId) throw new Error('Missing projectId')
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new Error('Project not found')
  const ps: any = project.pricingSheet || {}
  const enabled = ps.enabled !== false
  const tripFee = typeof ps.tripFee === 'number' ? ps.tripFee : 0
  const emergencyMultiplier = (project as any).emergencyMultiplier || 1
  const items = Array.isArray(ps.items)
    ? ps.items.map((it: any) => ({
        service: String(it.service || ''),
        basePrice: typeof it.basePrice === 'number' ? it.basePrice : null,
        unit: it.unit || 'flat',
        description: it.description ? String(it.description) : undefined,
      }))
    : []
  const notes = ps.notes ? String(ps.notes) : undefined
  return { enabled, tripFee, emergencyMultiplier, items, notes }
}

export async function GET(req: NextRequest) {
  try {
    const projectId = normalizeProjectId(req)
    const pricing = await getPricing(projectId)
    
    // Format result for Vapi AI
    const parts: string[] = []
    if (pricing.tripFee > 0) parts.push(`Trip fee: $${pricing.tripFee}`)
    if (pricing.items.length > 0) {
      const examples = pricing.items.slice(0, 3).map((item: any) => 
        item.basePrice ? `${item.service}: $${item.basePrice}` : item.service
      )
      parts.push(`Services: ${examples.join(', ')}`)
    }
    if (pricing.notes) parts.push(`Note: ${pricing.notes}`)
    
    return NextResponse.json({ 
      result: parts.join('. '),
      pricing 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get pricing' }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const RawSchema = z.object({ projectId: z.string().min(1).optional() })
    const parsed = RawSchema.parse(body)
    const projectId = normalizeProjectId(req, parsed?.projectId)
    const pricing = await getPricing(projectId)
    
    // Format result for Vapi AI
    const parts: string[] = []
    if (pricing.tripFee > 0) parts.push(`Trip fee: $${pricing.tripFee}`)
    if (pricing.items.length > 0) {
      const examples = pricing.items.slice(0, 3).map((item: any) => 
        item.basePrice ? `${item.service}: $${item.basePrice}` : item.service
      )
      parts.push(`Services: ${examples.join(', ')}`)
    }
    if (pricing.notes) parts.push(`Note: ${pricing.notes}`)
    
    return NextResponse.json({ 
      result: parts.join('. '),
      pricing 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get pricing' }, { status: 200 })
  }
}
