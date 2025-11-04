// Week 4, Day 20: Enhanced Health Check & Monitoring
import { prisma } from '../db.js'
import { CallSessionManager } from '../session-manager.js'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: {
      status: 'up' | 'down'
      latency?: number // ms
      error?: string
    }
    openai: {
      status: 'up' | 'down' | 'unknown'
      error?: string
    }
    twilio: {
      status: 'configured' | 'not_configured'
      error?: string
    }
    server: {
      status: 'up'
      uptime: number // seconds
      activeSessions: number
      memoryUsage: NodeJS.MemoryUsage
    }
  }
}

/**
 * Enhanced health check that tests all critical services
 */
export async function getHealthStatus(
  sessionManager: CallSessionManager
): Promise<HealthStatus> {
  const startTime = Date.now()
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'down' },
      openai: { status: 'unknown' },
      twilio: { status: 'not_configured' },
      server: {
        status: 'up',
        uptime: Math.floor(process.uptime()),
        activeSessions: sessionManager.getActiveSessionsCount(),
        memoryUsage: process.memoryUsage(),
      },
    },
  }

  // Check database
  try {
    const dbStartTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStartTime
    healthStatus.services.database = {
      status: 'up',
      latency: dbLatency,
    }
  } catch (error: any) {
    healthStatus.services.database = {
      status: 'down',
      error: error.message || 'Database connection failed',
    }
    healthStatus.status = 'unhealthy'
  }

  // Check OpenAI API key configuration
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    healthStatus.services.openai = {
      status: 'down',
      error: 'OPENAI_API_KEY not configured',
    }
    healthStatus.status = healthStatus.status === 'healthy' ? 'degraded' : 'unhealthy'
  } else {
    // Test OpenAI API (optional - can be expensive, so just check key exists)
    healthStatus.services.openai = {
      status: 'up',
    }
  }

  // Check Twilio configuration
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
  if (!twilioAccountSid || !twilioAuthToken) {
    healthStatus.services.twilio = {
      status: 'not_configured',
      error: 'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured',
    }
    healthStatus.status = healthStatus.status === 'healthy' ? 'degraded' : 'unhealthy'
  } else {
    healthStatus.services.twilio = {
      status: 'configured',
    }
  }

  return healthStatus
}

/**
 * Quick health check for load balancers (fast, no DB query)
 */
export function getQuickHealthCheck(sessionManager: CallSessionManager): {
  status: 'ok' | 'error'
  timestamp: string
  uptime: number
  activeSessions: number
} {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    activeSessions: sessionManager.getActiveSessionsCount(),
  }
}
