import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { CallSessionManager } from './session-manager.js'
import { setupTwilioRoutes } from './twilio/routes.js'
import { setupMediaStreamHandler } from './twilio/media-streams.js'
import { setupAnalyticsRoutes } from './analytics/routes.js'
import { getHealthStatus, getQuickHealthCheck } from './monitoring/health.js'
import { prisma } from './db.js'

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

const PORT = process.env.PORT || 8080

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Initialize session manager
const sessionManager = new CallSessionManager(wss)

// Health check endpoints (Week 4, Day 20: Enhanced)
app.get('/health', (req, res) => {
  // Quick health check (for load balancers)
  const quick = getQuickHealthCheck(sessionManager)
  res.json(quick)
})

app.get('/health/detailed', async (req, res) => {
  try {
    // Full health check with service status
    const health = await getHealthStatus(sessionManager)
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503
    res.status(statusCode).json(health)
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message || 'Health check failed',
    })
  }
})

// Setup Twilio routes (for TwiML responses)
setupTwilioRoutes(app, sessionManager)

// Setup Media Streams WebSocket handler
setupMediaStreamHandler(wss, sessionManager)

// Setup Analytics routes (Week 4, Day 19)
setupAnalyticsRoutes(app)

// Start server
server.listen(PORT, () => {
  console.log(`🚀 AfterHourFix Realtime Server running on port ${PORT}`)
  console.log(`📡 WebSocket server ready for connections`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
  console.log(`🔗 Detailed health: http://localhost:${PORT}/health/detailed`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  sessionManager.shutdown()
  await prisma.$disconnect()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  sessionManager.shutdown()
  await prisma.$disconnect()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

// Global error handlers (Week 4, Day 20)
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error)
  // Send critical alert
  const { sendAlert, Alerts, getAlertConfig } = await import('./monitoring/alerts.js')
  await sendAlert(Alerts.databaseError(error.message), getAlertConfig())
  // Give time for alert to send, then exit
  setTimeout(() => process.exit(1), 1000)
})

process.on('unhandledRejection', async (reason: any, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Send error alert
  const { sendAlert, Alerts, getAlertConfig } = await import('./monitoring/alerts.js')
  await sendAlert(
    {
      level: 'error',
      title: 'Unhandled Promise Rejection',
      message: reason?.message || String(reason),
      metadata: { reason: String(reason) },
      timestamp: new Date(),
    },
    getAlertConfig()
  )
})
