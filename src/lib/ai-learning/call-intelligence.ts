/**
 * Call Intelligence Service
 * Analyzes call transcripts to identify patterns, extract insights, and generate improvements
 */

import { prisma } from '@/lib/db'

export interface CallAnalysis {
  callId: string
  wasSuccessful: boolean
  bookingCreated: boolean
  customerSatisfactionScore?: number
  durationSec: number
  functionCallsCount: number
  identifiedPatterns: string[]
  extractedQuestions: string[]
  keyPhrases: string[]
  emergencyDetected: boolean
  issueType?: string
  resolutionType?: 'booked' | 'callback' | 'escalated' | 'incomplete'
}

export interface KnowledgeGap {
  question: string
  frequency: number
  firstSeen: Date
  lastSeen: Date
  wasAnswered: boolean
  suggestedAnswer?: string
  relatedCalls: string[]
}

export interface PromptSuggestion {
  type: 'greeting' | 'emergency_detection' | 'booking_flow' | 'pricing' | 'closing'
  currentText?: string
  suggestedText: string
  reason: string
  confidence: number
  basedOnCalls: number
}

/**
 * Analyze a single call transcript to extract insights
 */
export async function analyzeCall(callId: string): Promise<CallAnalysis> {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      bookings: true,
      project: true,
    },
  })

  if (!call || !call.transcript) {
    throw new Error('Call not found or has no transcript')
  }

  const transcript = call.transcript.toLowerCase()
  const lines = call.transcript.split('\n\n')

  // Determine if call was successful
  const bookingCreated = call.bookings.length > 0
  const wasSuccessful = bookingCreated && call.status === 'completed'

  // Extract customer questions (lines starting with "Customer:" and ending with "?")
  const extractedQuestions: string[] = []
  for (const line of lines) {
    if (line.startsWith('Customer:') && line.includes('?')) {
      const question = line.replace('Customer:', '').trim()
      extractedQuestions.push(question)
    }
  }

  // Detect emergency patterns
  const emergencyKeywords = [
    'emergency', 'urgent', 'asap', 'burst', 'flooding', 'leak', 'no heat',
    'sparks', 'smoke', 'gas smell', 'locked out', 'stranded'
  ]
  const emergencyDetected = emergencyKeywords.some(kw => transcript.includes(kw))

  // Identify issue type from transcript
  let issueType: string | undefined
  const issuePatterns = {
    leak: /leak|water|drip|burst pipe|flooding/i,
    hvac: /heat|cool|ac|furnace|hvac|temperature|thermostat/i,
    electrical: /power|electric|outlet|breaker|wiring|light/i,
    drain: /drain|clog|backup|sewage|toilet/i,
  }

  for (const [type, pattern] of Object.entries(issuePatterns)) {
    if (pattern.test(call.transcript)) {
      issueType = type
      break
    }
  }

  // Determine resolution type
  let resolutionType: 'booked' | 'callback' | 'escalated' | 'incomplete' = 'incomplete'
  if (bookingCreated) {
    resolutionType = 'booked'
  } else if (call.escalated) {
    resolutionType = 'escalated'
  } else if (/call.*back|later|message/i.test(transcript)) {
    resolutionType = 'callback'
  }

  // Extract key phrases (repeated multi-word phrases)
  const keyPhrases = extractKeyPhrases(call.transcript)

  // Identify patterns
  const identifiedPatterns: string[] = []
  if (emergencyDetected) identifiedPatterns.push('emergency_call')
  if (extractedQuestions.length > 3) identifiedPatterns.push('many_questions')
  if (call.durationSec && call.durationSec < 120) identifiedPatterns.push('quick_call')
  if (call.durationSec && call.durationSec > 600) identifiedPatterns.push('long_call')
  if (bookingCreated && call.durationSec && call.durationSec < 180) identifiedPatterns.push('fast_booking')
  if (/pricing|cost|price|how much/i.test(transcript)) identifiedPatterns.push('pricing_question')

  return {
    callId: call.id,
    wasSuccessful,
    bookingCreated,
    durationSec: call.durationSec || 0,
    functionCallsCount: 0, // TODO: Track in Call table
    identifiedPatterns,
    extractedQuestions,
    keyPhrases,
    emergencyDetected,
    issueType,
    resolutionType,
  }
}

/**
 * Analyze multiple recent calls to identify knowledge gaps
 */
export async function identifyKnowledgeGaps(
  projectId: string,
  options: { limit?: number; daysBack?: number } = {}
): Promise<KnowledgeGap[]> {
  const { limit = 100, daysBack = 30 } = options

  const since = new Date()
  since.setDate(since.getDate() - daysBack)

  const calls = await prisma.call.findMany({
    where: {
      projectId,
      createdAt: { gte: since },
      transcript: { not: null },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  })

  // Extract all questions from all calls
  const questionMap = new Map<string, {
    frequency: number
    firstSeen: Date
    lastSeen: Date
    wasAnswered: boolean
    callIds: string[]
  }>()

  for (const call of calls) {
    if (!call.transcript) continue

    const lines = call.transcript.split('\n\n')
    for (const line of lines) {
      if (line.startsWith('Customer:') && line.includes('?')) {
        const question = normalizeQuestion(line.replace('Customer:', '').trim())
        
        // Check if AI answered (next line is "AI:")
        const lineIndex = lines.indexOf(line)
        const nextLine = lines[lineIndex + 1]
        const wasAnswered = nextLine?.startsWith('AI:') && nextLine.length > 20

        const existing = questionMap.get(question)
        if (existing) {
          existing.frequency++
          existing.lastSeen = call.createdAt
          existing.callIds.push(call.id)
          // Mark as answered if any occurrence was answered
          if (wasAnswered) existing.wasAnswered = true
        } else {
          questionMap.set(question, {
            frequency: 1,
            firstSeen: call.createdAt,
            lastSeen: call.createdAt,
            wasAnswered,
            callIds: [call.id],
          })
        }
      }
    }
  }

  // Convert to array and filter for repeated unanswered questions
  const gaps: KnowledgeGap[] = []
  for (const [question, data] of questionMap.entries()) {
    // Only flag as knowledge gap if asked 2+ times or asked once but not answered well
    if (data.frequency >= 2 || (data.frequency === 1 && !data.wasAnswered)) {
      gaps.push({
        question,
        frequency: data.frequency,
        firstSeen: data.firstSeen,
        lastSeen: data.lastSeen,
        wasAnswered: data.wasAnswered,
        relatedCalls: data.callIds,
      })
    }
  }

  // Sort by frequency (most common questions first)
  return gaps.sort((a, b) => b.frequency - a.frequency)
}

/**
 * Generate prompt optimization suggestions based on successful calls
 */
export async function generatePromptSuggestions(
  projectId: string,
  options: { minCallsRequired?: number } = {}
): Promise<PromptSuggestion[]> {
  const { minCallsRequired = 10 } = options

  const suggestions: PromptSuggestion[] = []

  // Get successful booking calls (completed with booking)
  const successfulCalls = await prisma.call.findMany({
    where: {
      projectId,
      status: 'completed',
      bookings: { some: { status: 'booked' } },
      transcript: { not: null },
    },
    include: { bookings: true },
    take: 50,
    orderBy: { createdAt: 'desc' },
  })

  if (successfulCalls.length < minCallsRequired) {
    // Not enough data yet
    return suggestions
  }

  // Analyze greeting effectiveness
  const greetings = successfulCalls
    .map(c => extractFirstAILine(c.transcript || ''))
    .filter(g => g.length > 0)

  if (greetings.length >= 5) {
    const mostCommon = findMostCommonPhrase(greetings)
    if (mostCommon) {
      suggestions.push({
        type: 'greeting',
        suggestedText: mostCommon,
        reason: `This greeting appeared in ${greetings.filter(g => g.includes(mostCommon)).length} successful booking calls`,
        confidence: 0.8,
        basedOnCalls: greetings.length,
      })
    }
  }

  // Analyze fast bookings (under 3 minutes) to find efficient phrases
  const fastBookings = successfulCalls.filter(c => c.durationSec && c.durationSec < 180)
  if (fastBookings.length >= 5) {
    suggestions.push({
      type: 'booking_flow',
      suggestedText: 'Focus on getting name, phone, and address quickly in the first 60 seconds',
      reason: `${fastBookings.length} successful bookings completed in under 3 minutes by getting info upfront`,
      confidence: 0.85,
      basedOnCalls: fastBookings.length,
    })
  }

  // Analyze emergency calls
  const emergencyCalls = successfulCalls.filter(c => 
    c.transcript && /emergency|urgent|asap|burst|leak|no heat/i.test(c.transcript)
  )
  if (emergencyCalls.length >= 3) {
    suggestions.push({
      type: 'emergency_detection',
      suggestedText: 'When emergency keywords detected, immediately prioritize same-day booking',
      reason: `${emergencyCalls.length} emergency calls successfully booked`,
      confidence: 0.9,
      basedOnCalls: emergencyCalls.length,
    })
  }

  return suggestions
}

/**
 * Generate auto-FAQ entries from repeated questions
 */
export async function generateAutoFAQs(projectId: string): Promise<Array<{ question: string; suggestedAnswer: string; confidence: number }>> {
  const gaps = await identifyKnowledgeGaps(projectId, { limit: 200 })
  
  const faqs: Array<{ question: string; suggestedAnswer: string; confidence: number }> = []

  for (const gap of gaps) {
    // Only generate FAQs for frequently asked questions (3+)
    if (gap.frequency >= 3) {
      // Fetch related calls to extract AI's answers
      const relatedCalls = await prisma.call.findMany({
        where: { id: { in: gap.relatedCalls } },
        select: { transcript: true },
      })

      // Extract AI responses to this question
      const answers: string[] = []
      for (const call of relatedCalls) {
        if (!call.transcript) continue
        
        const lines = call.transcript.split('\n\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          const normalizedQuestion = normalizeQuestion(line.replace('Customer:', '').trim())
          
          if (normalizedQuestion === gap.question && lines[i + 1]?.startsWith('AI:')) {
            const answer = lines[i + 1].replace('AI:', '').trim()
            if (answer.length > 20) {
              answers.push(answer)
            }
          }
        }
      }

      // Find most common answer
      if (answers.length > 0) {
        const commonAnswer = findMostCommonPhrase(answers)
        if (commonAnswer) {
          faqs.push({
            question: gap.question,
            suggestedAnswer: commonAnswer,
            confidence: Math.min(0.95, 0.5 + (gap.frequency * 0.1)),
          })
        }
      }
    }
  }

  return faqs.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Helper: Extract key phrases from text (2-4 word phrases that appear 2+ times)
 */
function extractKeyPhrases(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/)
  const phrases: Map<string, number> = new Map()

  // Extract 2-4 word phrases
  for (let i = 0; i < words.length - 1; i++) {
    for (let len = 2; len <= 4; len++) {
      if (i + len <= words.length) {
        const phrase = words.slice(i, i + len).join(' ')
        // Filter out common phrases and short phrases
        if (phrase.length > 8 && !isCommonPhrase(phrase)) {
          phrases.set(phrase, (phrases.get(phrase) || 0) + 1)
        }
      }
    }
  }

  // Return phrases that appear 2+ times
  return Array.from(phrases.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase]) => phrase)
}

/**
 * Helper: Check if phrase is too common to be useful
 */
function isCommonPhrase(phrase: string): boolean {
  const commonPhrases = [
    'you know', 'i mean', 'i think', 'right now', 'over there',
    'out there', 'going to', 'want to', 'need to', 'have to'
  ]
  return commonPhrases.some(cp => phrase.includes(cp))
}

/**
 * Helper: Normalize question for matching
 */
function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[?!.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Helper: Extract first AI line from transcript
 */
function extractFirstAILine(transcript: string): string {
  const lines = transcript.split('\n\n')
  for (const line of lines) {
    if (line.startsWith('AI:')) {
      return line.replace('AI:', '').trim()
    }
  }
  return ''
}

/**
 * Helper: Find most common phrase in array
 */
function findMostCommonPhrase(phrases: string[]): string | null {
  if (phrases.length === 0) return null
  
  const counts = new Map<string, number>()
  for (const phrase of phrases) {
    const normalized = phrase.toLowerCase().trim()
    counts.set(normalized, (counts.get(normalized) || 0) + 1)
  }
  
  let maxCount = 0
  let mostCommon = ''
  for (const [phrase, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count
      mostCommon = phrase
    }
  }
  
  return mostCommon || null
}

