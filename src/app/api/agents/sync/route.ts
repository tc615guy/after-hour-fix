import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Sync assistant settings to OpenAI Realtime agent
 * Updates agent.basePrompt with knowledge base, pricing, and custom settings
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, agentId } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const agent = agentId
      ? await prisma.agent.findUnique({ where: { id: agentId } })
      : await prisma.agent.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } })

    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    // Build knowledge base context for OpenAI Realtime agent
    let knowledgeContext = ''

    // Get FAQs
    const faqsLatest = await prisma.eventLog.findFirst({
      where: { projectId, type: 'knowledge.faqs.updated' },
      orderBy: { createdAt: 'desc' },
    })
    const faqs = (faqsLatest?.payload as any)?.faqs || []

    // Get snippets
    const snippetsLatest = await prisma.eventLog.findFirst({
      where: { projectId, type: 'knowledge.snippets.updated' },
      orderBy: { createdAt: 'desc' },
    })
    const snippets = (snippetsLatest?.payload as any)?.snippets || []

    // Build knowledge block
    if (faqs.length > 0 || snippets.length > 0) {
      knowledgeContext += '\n\n---\nKNOWLEDGE BASE (INTERNAL REFERENCE)\n'
      
      if (faqs.length > 0) {
        knowledgeContext += '\nFAQs:\n'
        faqs.forEach((faq: any, i: number) => {
          knowledgeContext += `${i + 1}. Q: ${faq.q}\n   A: ${faq.a}\n`
        })
      }

      if (snippets.length > 0) {
        knowledgeContext += '\nKnowledge Snippets:\n'
        snippets.forEach((snippet: any, i: number) => {
          knowledgeContext += `${i + 1}. ${snippet.title}: ${snippet.content}\n`
        })
      }

      knowledgeContext += '--- END KNOWLEDGE BASE ---\n'
    }

    // Combine with existing basePrompt (which includes pricing from push-pricing endpoint)
    // Preserve pricing data if it exists
    let existingPrompt = agent.basePrompt || ''
    
    // Remove old knowledge block if it exists
    const knowledgeRegex = /\n\n---\nKNOWLEDGE BASE \(INTERNAL REFERENCE\)[\s\S]*?--- END KNOWLEDGE BASE ---\n/
    existingPrompt = existingPrompt.replace(knowledgeRegex, '')

    // Append new knowledge context
    const combined = existingPrompt + knowledgeContext

    // Update agent with knowledge base
    await prisma.agent.update({ 
      where: { id: agent.id }, 
      data: { basePrompt: combined } 
    })

    await prisma.eventLog.create({
      data: { projectId, type: 'agent.synced', payload: { agentId: agent.id, target: 'openai_realtime', hasKnowledge: knowledgeContext.length > 0 } },
    })

    console.log('[Agent Sync] Updated agent basePrompt for OpenAI Realtime:', { 
      agentId: agent.id, 
      projectId, 
      knowledgeLength: knowledgeContext.length,
      totalLength: combined.length,
      faqs: faqs.length,
      snippets: snippets.length
    })

    return NextResponse.json({ success: true, faqsCount: faqs.length, snippetsCount: snippets.length })
  } catch (error: any) {
    console.error('[Agent Sync] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to sync assistant' }, { status: 500 })
  }
}

