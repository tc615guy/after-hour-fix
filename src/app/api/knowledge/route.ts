import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Helper function to extract projectId from request
function normalizeProjectId(req: NextRequest, bodyProjectId?: string) {
  const url = new URL(req.url)
  return (
    bodyProjectId ||
    url.searchParams.get('projectId') ||
    url.searchParams.get('project_id') ||
    url.pathname.split('/projects/')[1]?.split('/')[0] ||
    ''
  )
}

/**
 * API endpoint for AI assistant to query knowledge base, warranty, and service area info
 * Called via function calling from Vapi assistant
 */
async function handleKnowledgeRequest(req: NextRequest) {
  try {
    // Try to get projectId from body (POST) or query params (GET)
    const body = await req.json().catch(() => ({}))
    const projectId = normalizeProjectId(req, body.projectId)

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get knowledge base (FAQs and snippets)
    const faqsLatest = await prisma.eventLog.findFirst({
      where: { projectId, type: 'knowledge.faqs.updated' },
      orderBy: { createdAt: 'desc' },
    })
    const faqs = (faqsLatest?.payload as any)?.faqs || []

    const snippetsLatest = await prisma.eventLog.findFirst({
      where: { projectId, type: 'knowledge.snippets.updated' },
      orderBy: { createdAt: 'desc' },
    })
    const snippets = (snippetsLatest?.payload as any)?.snippets || []

    // Get warranty info
    const warranty = (project as any).warrantyInfo || null

    // Get service area config
    const serviceArea = (project as any).serviceArea || null
    const serviceRadius = (project as any).serviceRadius || null
    const businessAddress = (project as any).businessAddress || null

    // Build response
    let response = 'Knowledge Base Information:\n\n'

    if (faqs.length > 0) {
      response += 'FAQs:\n'
      faqs.forEach((faq: any, i: number) => {
        response += `${i + 1}. Q: ${faq.q}\n   A: ${faq.a}\n\n`
      })
    }

    if (snippets.length > 0) {
      response += 'Knowledge Snippets:\n'
      snippets.forEach((snippet: any, i: number) => {
        response += `${i + 1}. ${snippet.title}: ${snippet.content}\n\n`
      })
    }

    if (warranty) {
      response += 'Warranty Information:\n'
      if (typeof warranty === 'object') {
        if (warranty.period) response += `Period: ${warranty.period}\n`
        if (warranty.coverage) response += `Coverage: ${warranty.coverage}\n`
        if (warranty.exclusions && Array.isArray(warranty.exclusions)) {
          response += `Exclusions: ${warranty.exclusions.join(', ')}\n`
        }
      } else {
        response += `${warranty}\n`
      }
      response += '\n'
    }

    if (serviceArea || serviceRadius || businessAddress) {
      response += 'Service Area:\n'
      if (businessAddress) response += `Business Address: ${businessAddress}\n`
      if (serviceRadius) response += `Service Radius: ${serviceRadius} miles\n`
      if (serviceArea) {
        const sa: any = serviceArea
        if (sa.type) response += `Type: ${sa.type}\n`
        if (sa.value && Array.isArray(sa.value)) {
          response += `Value: ${sa.value.join(', ')}\n`
        }
      }
      response += '\n'
    }

    // Return format that Vapi AI can read
    // Include a "result" field with human-readable knowledge summary
    return NextResponse.json({
      result: response.trim() || 'No additional knowledge available.',
      success: true,
      knowledge: response,
      faqs: faqs.length,
      snippets: snippets.length,
      hasWarranty: !!warranty,
      hasServiceArea: !!(serviceArea || serviceRadius),
    })
  } catch (error: any) {
    console.error('[Knowledge API] Error:', error)
    return NextResponse.json(
      { 
        result: 'Unable to retrieve knowledge at this time.',
        error: error.message || 'Failed to fetch knowledge' 
      },
      { status: 200 } // Return 200 so Vapi can read the error message
    )
  }
}

// Support both GET and POST requests
export async function GET(req: NextRequest) {
  return handleKnowledgeRequest(req)
}

export async function POST(req: NextRequest) {
  return handleKnowledgeRequest(req)
}

