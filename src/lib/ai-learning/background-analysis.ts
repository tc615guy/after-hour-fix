/**
 * Background Analysis Job
 * Runs periodically to analyze recent calls and generate insights
 */

import { prisma } from '@/lib/db'
import { analyzeCall, identifyKnowledgeGaps, generatePromptSuggestions, generateAutoFAQs } from './call-intelligence'

export interface AnalysisJobResult {
  projectId: string
  analyzedCalls: number
  knowledgeGaps: number
  promptSuggestions: number
  autoFAQs: number
  timestamp: Date
}

/**
 * Run analysis for a single project
 */
export async function runProjectAnalysis(projectId: string): Promise<AnalysisJobResult> {
  console.log(`[Background Analysis] Starting analysis for project ${projectId}`)

  // Get recent un-analyzed calls (last 7 days)
  const since = new Date()
  since.setDate(since.getDate() - 7)

  const recentCalls = await prisma.call.findMany({
    where: {
      projectId,
      createdAt: { gte: since },
      transcript: { not: null },
      status: 'completed',
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Analyze each call
  let analyzedCount = 0
  for (const call of recentCalls) {
    try {
      await analyzeCall(call.id)
      analyzedCount++
    } catch (error: any) {
      console.error(`[Background Analysis] Failed to analyze call ${call.id}:`, error.message)
    }
  }

  // Generate insights
  const [gaps, suggestions, faqs] = await Promise.all([
    identifyKnowledgeGaps(projectId, { limit: 100, daysBack: 30 }),
    generatePromptSuggestions(projectId, { minCallsRequired: 5 }),
    generateAutoFAQs(projectId),
  ])

  // Store insights summary in EventLog
  await prisma.eventLog.create({
    data: {
      projectId,
      type: 'ai_analysis.completed',
      payload: {
        analyzedCalls: analyzedCount,
        knowledgeGapsCount: gaps.length,
        promptSuggestionsCount: suggestions.length,
        autoFAQsCount: faqs.length,
        timestamp: new Date().toISOString(),
      },
    },
  })

  console.log(`[Background Analysis] Completed for project ${projectId}: ${analyzedCount} calls analyzed, ${gaps.length} knowledge gaps, ${suggestions.length} suggestions, ${faqs.length} auto-FAQs`)

  return {
    projectId,
    analyzedCalls: analyzedCount,
    knowledgeGaps: gaps.length,
    promptSuggestions: suggestions.length,
    autoFAQs: faqs.length,
    timestamp: new Date(),
  }
}

/**
 * Run analysis for all active projects
 */
export async function runGlobalAnalysis(): Promise<AnalysisJobResult[]> {
  console.log('[Background Analysis] Starting global analysis for all projects')

  // Get all projects with recent activity (calls in last 30 days)
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const activeProjects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      calls: {
        some: {
          createdAt: { gte: since },
        },
      },
    },
    select: { id: true, name: true },
  })

  console.log(`[Background Analysis] Found ${activeProjects.length} active projects`)

  const results: AnalysisJobResult[] = []

  for (const project of activeProjects) {
    try {
      const result = await runProjectAnalysis(project.id)
      results.push(result)
    } catch (error: any) {
      console.error(`[Background Analysis] Failed to analyze project ${project.id}:`, error.message)
    }
  }

  console.log(`[Background Analysis] Global analysis complete. Analyzed ${results.length} projects.`)

  return results
}

/**
 * Schedule periodic analysis (call this from a cron job or scheduled task)
 */
export async function schedulePeriodicAnalysis(intervalHours: number = 24) {
  console.log(`[Background Analysis] Scheduling analysis every ${intervalHours} hours`)

  // Run immediately
  await runGlobalAnalysis()

  // Schedule future runs
  setInterval(async () => {
    try {
      await runGlobalAnalysis()
    } catch (error: any) {
      console.error('[Background Analysis] Scheduled analysis failed:', error)
    }
  }, intervalHours * 60 * 60 * 1000)
}

