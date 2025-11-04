// Week 4, Day 19: Call Logging & Analytics
import { prisma } from './db.js'

export interface CallAnalytics {
  totalCalls: number
  completedCalls: number
  missedCalls: number
  failedCalls: number
  averageDuration: number // seconds
  totalDuration: number // seconds
  totalFunctionCalls: number
  errorRate: number // percentage
  callsByStatus: {
    completed: number
    missed: number
    failed: number
    active: number
  }
  callsByIntent: {
    emergency: number
    routine: number
    unknown: number
  }
}

export interface ProjectAnalytics extends CallAnalytics {
  projectId: string
  projectName: string
  dateRange: {
    start: Date
    end: Date
  }
}

/**
 * Get call analytics for a project
 */
export async function getProjectCallAnalytics(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ProjectAnalytics | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    })

    if (!project) {
      return null
    }

    const now = new Date()
    const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days
    const end = endDate || now

    // Get all calls in date range
    const calls = await prisma.call.findMany({
      where: {
        projectId,
        createdAt: {
          gte: start,
          lte: end,
        },
        deletedAt: null,
      },
    })

    // Calculate analytics
    const totalCalls = calls.length
    const completedCalls = calls.filter(c => c.status === 'completed').length
    const missedCalls = calls.filter(c => c.status === 'missed').length
    const failedCalls = calls.filter(c => c.status === 'failed').length
    const activeCalls = calls.filter(c => c.status === 'active').length

    // Duration stats
    const durations = calls
      .filter(c => c.durationSec !== null && c.durationSec !== undefined)
      .map(c => c.durationSec!)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const averageDuration = durations.length > 0 ? totalDuration / durations.length : 0

    // Intent stats
    const emergencyCalls = calls.filter(c => c.intent === 'emergency').length
    const routineCalls = calls.filter(c => c.intent && c.intent !== 'emergency' && c.intent !== null).length
    const unknownIntent = calls.filter(c => !c.intent || c.intent === null).length

    // Function call stats (from EventLog)
    const functionCallEvents = await prisma.eventLog.count({
      where: {
        projectId,
        type: 'function_call.error',
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    })

    const errorRate = totalCalls > 0 ? (functionCallEvents / totalCalls) * 100 : 0

    return {
      projectId: project.id,
      projectName: project.name,
      dateRange: { start, end },
      totalCalls,
      completedCalls,
      missedCalls,
      failedCalls,
      averageDuration: Math.round(averageDuration),
      totalDuration,
      totalFunctionCalls: functionCallEvents, // Approximate - could be improved with dedicated tracking
      errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimals
      callsByStatus: {
        completed: completedCalls,
        missed: missedCalls,
        failed: failedCalls,
        active: activeCalls,
      },
      callsByIntent: {
        emergency: emergencyCalls,
        routine: routineCalls,
        unknown: unknownIntent,
      },
    }
  } catch (error: any) {
    console.error(`[Analytics] Error getting project analytics for ${projectId}:`, error)
    throw error
  }
}

/**
 * Get recent calls with details
 */
export async function getRecentCalls(
  projectId: string,
  limit: number = 10
): Promise<Array<{
  id: string
  callSid: string | null
  status: string
  durationSec: number | null
  intent: string | null
  fromNumber: string
  createdAt: Date
  transcriptPreview?: string
}>> {
  try {
    const calls = await prisma.call.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        vapiCallId: true,
        status: true,
        durationSec: true,
        intent: true,
        fromNumber: true,
        createdAt: true,
        transcript: true,
      },
    })

    return calls.map(call => ({
      id: call.id,
      callSid: call.vapiCallId,
      status: call.status,
      durationSec: call.durationSec,
      intent: call.intent,
      fromNumber: call.fromNumber,
      createdAt: call.createdAt,
      transcriptPreview: call.transcript
        ? call.transcript.substring(0, 100) + (call.transcript.length > 100 ? '...' : '')
        : undefined,
    }))
  } catch (error: any) {
    console.error(`[Analytics] Error getting recent calls for ${projectId}:`, error)
    throw error
  }
}

/**
 * Get call statistics for a time period
 */
export async function getCallStatistics(
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalCalls: number
  completedCalls: number
  averageCallDuration: number
  totalMinutes: number
  callsByDay: Array<{ date: string; count: number }>
}> {
  try {
    const calls = await prisma.call.findMany({
      where: {
        projectId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      select: {
        status: true,
        durationSec: true,
        createdAt: true,
      },
    })

    const totalCalls = calls.length
    const completedCalls = calls.filter(c => c.status === 'completed').length

    const durations = calls
      .filter(c => c.durationSec !== null && c.durationSec !== undefined)
      .map(c => c.durationSec!)
    const totalSeconds = durations.reduce((sum, d) => sum + d, 0)
    const averageCallDuration = durations.length > 0 ? totalSeconds / durations.length : 0
    const totalMinutes = Math.round(totalSeconds / 60)

    // Group by day
    const callsByDayMap = new Map<string, number>()
    calls.forEach(call => {
      const dateKey = call.createdAt.toISOString().split('T')[0] // YYYY-MM-DD
      callsByDayMap.set(dateKey, (callsByDayMap.get(dateKey) || 0) + 1)
    })

    const callsByDay = Array.from(callsByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalCalls,
      completedCalls,
      averageCallDuration: Math.round(averageCallDuration),
      totalMinutes,
      callsByDay,
    }
  } catch (error: any) {
    console.error(`[Analytics] Error getting call statistics for ${projectId}:`, error)
    throw error
  }
}
