import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const UpdatePromptSchema = z.object({
  prompt: z.string().min(1),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vapiAssistantId } = await params
    const body = await req.json()
    const { prompt } = UpdatePromptSchema.parse(body)

    // Find agent in database
    const agent = await prisma.agent.findFirst({
      where: { vapiAssistantId },
      include: { project: true },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Update Vapi assistant system prompt
    const vapiRes = await fetch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: {
          messages: [
            {
              role: 'system',
              content: prompt,
            },
          ],
        },
      }),
    })

    if (!vapiRes.ok) {
      const error = await vapiRes.text()
      console.error('Vapi update error:', error)
      return NextResponse.json(
        { error: 'Failed to update assistant in Vapi' },
        { status: 500 }
      )
    }

    // Update database
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        basePrompt: prompt,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update prompt error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update prompt' },
      { status: 500 }
    )
  }
}
