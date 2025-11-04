// Week 4, Day 20: Alert System
import { prisma } from '../db.js'

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical'

export interface Alert {
  level: AlertLevel
  title: string
  message: string
  projectId?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export interface AlertConfig {
  webhookUrl?: string
  emailRecipient?: string
  minLevel?: AlertLevel // Only send alerts at or above this level
}

/**
 * Send an alert notification
 */
export async function sendAlert(
  alert: Alert,
  config?: AlertConfig
): Promise<void> {
  const minLevel = config?.minLevel || 'error'
  const levelPriority: Record<AlertLevel, number> = {
    info: 0,
    warning: 1,
    error: 2,
    critical: 3,
  }

  // Skip if alert level is below minimum
  if (levelPriority[alert.level] < levelPriority[minLevel]) {
    return
  }

  // Log to EventLog
  try {
    await prisma.eventLog.create({
      data: {
        projectId: alert.projectId || null,
        type: `alert.${alert.level}`,
        payload: {
          title: alert.title,
          message: alert.message,
          metadata: alert.metadata || {},
          timestamp: alert.timestamp.toISOString(),
        },
      },
    })
  } catch (error: any) {
    console.error('[Alert] Failed to log alert to EventLog:', error)
  }

  // Send webhook notification (if configured)
  if (config?.webhookUrl) {
    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: alert.level,
          title: alert.title,
          message: alert.message,
          projectId: alert.projectId,
          metadata: alert.metadata,
          timestamp: alert.timestamp.toISOString(),
        }),
      })
    } catch (error: any) {
      console.error('[Alert] Failed to send webhook notification:', error)
    }
  }

  // Send email notification (if configured) - TODO: Implement email sending
  if (config?.emailRecipient && (alert.level === 'error' || alert.level === 'critical')) {
    // Email sending would go here (using nodemailer, SendGrid, etc.)
    console.log(`[Alert] Email notification would be sent to ${config.emailRecipient}: ${alert.title}`)
  }

  // Always log to console for critical errors
  if (alert.level === 'critical' || alert.level === 'error') {
    console.error(`[Alert ${alert.level.toUpperCase()}] ${alert.title}: ${alert.message}`)
  } else if (alert.level === 'warning') {
    console.warn(`[Alert WARNING] ${alert.title}: ${alert.message}`)
  }
}

/**
 * Helper functions for common alert types
 */
export const Alerts = {
  /**
   * Alert for function call failures
   */
  functionCallFailure: (
    functionName: string,
    error: string,
    projectId?: string,
    callSid?: string
  ): Alert => ({
    level: 'error' as AlertLevel,
    title: 'Function Call Failed',
    message: `Function ${functionName} failed: ${error}`,
    projectId,
    metadata: { functionName, error, callSid },
    timestamp: new Date(),
  }),

  /**
   * Alert for OpenAI API errors
   */
  openaiError: (error: string, projectId?: string, callSid?: string): Alert => ({
    level: 'critical' as AlertLevel,
    title: 'OpenAI API Error',
    message: `OpenAI Realtime API error: ${error}`,
    projectId,
    metadata: { error, callSid },
    timestamp: new Date(),
  }),

  /**
   * Alert for database connection issues
   */
  databaseError: (error: string): Alert => ({
    level: 'critical' as AlertLevel,
    title: 'Database Connection Error',
    message: `Database connection failed: ${error}`,
    metadata: { error },
    timestamp: new Date(),
  }),

  /**
   * Alert for Twilio connection issues
   */
  twilioError: (error: string, callSid?: string): Alert => ({
    level: 'error' as AlertLevel,
    title: 'Twilio Connection Error',
    message: `Twilio error: ${error}`,
    metadata: { error, callSid },
    timestamp: new Date(),
  }),

  /**
   * Alert for high error rate
   */
  highErrorRate: (errorRate: number, projectId?: string): Alert => ({
    level: 'warning' as AlertLevel,
    title: 'High Error Rate Detected',
    message: `Error rate is ${errorRate.toFixed(1)}%, above threshold`,
    projectId,
    metadata: { errorRate },
    timestamp: new Date(),
  }),

  /**
   * Alert for session failures
   */
  sessionFailure: (callSid: string, error: string, projectId?: string): Alert => ({
    level: 'error' as AlertLevel,
    title: 'Call Session Failed',
    message: `Session ${callSid} failed: ${error}`,
    projectId,
    metadata: { callSid, error },
    timestamp: new Date(),
  }),
}

/**
 * Get alert configuration from environment or defaults
 */
export function getAlertConfig(): AlertConfig {
  return {
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    emailRecipient: process.env.ALERT_EMAIL_RECIPIENT,
    minLevel: (process.env.ALERT_MIN_LEVEL as AlertLevel) || 'error',
  }
}
