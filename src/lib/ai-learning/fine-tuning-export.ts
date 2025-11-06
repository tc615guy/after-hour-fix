/**
 * Fine-tuning Data Export
 * Exports high-quality call transcripts in OpenAI fine-tuning format
 */

import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export interface FineTuningExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
}

/**
 * Export high-quality calls for fine-tuning
 */
export async function exportFineTuningData(
  projectId: string,
  options: {
    minRating?: number
    minDuration?: number
    maxExamples?: number
    includeBookingsOnly?: boolean
  } = {}
): Promise<FineTuningExample[]> {
  const {
    minRating = 0.85,
    minDuration = 30,
    maxExamples = 1000,
    includeBookingsOnly = true,
  } = options

  console.log(`[Fine-tuning Export] Exporting data for project ${projectId}`)

  // Get high-quality successful calls
  const calls = await prisma.call.findMany({
    where: {
      projectId,
      status: 'completed',
      transcript: { not: null },
      voiceConfidence: { gte: minRating },
      durationSec: { gte: minDuration },
      ...(includeBookingsOnly && {
        bookings: { some: { status: 'booked' } },
      }),
    },
    include: {
      project: true,
      bookings: true,
    },
    orderBy: { createdAt: 'desc' },
    take: maxExamples,
  })

  console.log(`[Fine-tuning Export] Found ${calls.length} high-quality calls`)

  const examples: FineTuningExample[] = []

  for (const call of calls) {
    if (!call.transcript || !call.project) continue

    // Parse transcript into messages
    const lines = call.transcript.split('\n\n')
    const messages: FineTuningExample['messages'] = []

    // Add system prompt (simplified for fine-tuning)
    messages.push({
      role: 'system',
      content: `You are the AI receptionist for ${call.project.name}, a ${call.project.trade} company. Your job is to book appointments, answer questions, and provide helpful service.`,
    })

    // Parse conversation
    for (const line of lines) {
      if (line.startsWith('Customer:')) {
        messages.push({
          role: 'user',
          content: line.replace('Customer:', '').trim(),
        })
      } else if (line.startsWith('AI:')) {
        messages.push({
          role: 'assistant',
          content: line.replace('AI:', '').trim(),
        })
      }
    }

    // Only include if we have at least 2 exchanges
    if (messages.length >= 5) {
      examples.push({ messages })
    }
  }

  console.log(`[Fine-tuning Export] Exported ${examples.length} examples`)

  return examples
}

/**
 * Save fine-tuning data to JSONL file (OpenAI format)
 */
export async function saveFineTuningFile(
  projectId: string,
  outputPath?: string
): Promise<string> {
  const examples = await exportFineTuningData(projectId)

  // Generate filename
  const filename = outputPath || path.join(
    process.cwd(),
    'exports',
    `finetuning-${projectId}-${Date.now()}.jsonl`
  )

  // Ensure directory exists
  const dir = path.dirname(filename)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Write JSONL file (one JSON object per line)
  const lines = examples.map(ex => JSON.stringify(ex)).join('\n')
  fs.writeFileSync(filename, lines, 'utf8')

  console.log(`[Fine-tuning Export] Saved ${examples.length} examples to ${filename}`)

  return filename
}

/**
 * Get fine-tuning data statistics
 */
export async function getFineTuningStats(projectId: string) {
  const calls = await prisma.call.findMany({
    where: {
      projectId,
      status: 'completed',
      transcript: { not: null },
    },
    select: {
      voiceConfidence: true,
      durationSec: true,
      bookings: { select: { status: true } },
    },
  })

  const highQuality = calls.filter(c =>
    (c.voiceConfidence || 0) >= 0.85 &&
    (c.durationSec || 0) >= 30 &&
    c.bookings.some(b => b.status === 'booked')
  )

  const totalConversationTurns = highQuality.reduce((sum, call) => {
    // Estimate ~6-10 turns per minute
    return sum + Math.floor((call.durationSec || 0) / 60) * 8
  }, 0)

  return {
    totalCalls: calls.length,
    highQualityCalls: highQuality.length,
    estimatedExamples: highQuality.length,
    estimatedTurns: totalConversationTurns,
    readyForFineTuning: highQuality.length >= 50, // OpenAI recommends 50+ examples
  }
}

