// Week 4, Day 19: Analytics API Routes
import express from 'express'
import { getProjectCallAnalytics, getRecentCalls, getCallStatistics } from '../analytics.js'

export function setupAnalyticsRoutes(app: express.Application) {
  /**
   * GET /analytics/project/:projectId
   * Get comprehensive analytics for a project
   * Query params: startDate (ISO), endDate (ISO)
   */
  app.get('/analytics/project/:projectId', async (req, res) => {
    try {
      const { projectId } = req.params
      const { startDate, endDate } = req.query

      const start = startDate ? new Date(startDate as string) : undefined
      const end = endDate ? new Date(endDate as string) : undefined

      const analytics = await getProjectCallAnalytics(projectId, start, end)

      if (!analytics) {
        return res.status(404).json({ error: 'Project not found' })
      }

      res.json(analytics)
    } catch (error: any) {
      console.error('[Analytics] Error getting project analytics:', error)
      res.status(500).json({ error: error.message || 'Failed to get analytics' })
    }
  })

  /**
   * GET /analytics/project/:projectId/recent
   * Get recent calls for a project
   * Query params: limit (default: 10)
   */
  app.get('/analytics/project/:projectId/recent', async (req, res) => {
    try {
      const { projectId } = req.params
      const limit = parseInt(req.query.limit as string) || 10

      const calls = await getRecentCalls(projectId, Math.min(limit, 100)) // Max 100

      res.json({ calls })
    } catch (error: any) {
      console.error('[Analytics] Error getting recent calls:', error)
      res.status(500).json({ error: error.message || 'Failed to get recent calls' })
    }
  })

  /**
   * GET /analytics/project/:projectId/statistics
   * Get call statistics for a date range
   * Query params: startDate (ISO, required), endDate (ISO, required)
   */
  app.get('/analytics/project/:projectId/statistics', async (req, res) => {
    try {
      const { projectId } = req.params
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          error: 'startDate and endDate query parameters are required (ISO format)' 
        })
      }

      const start = new Date(startDate as string)
      const end = new Date(endDate as string)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid date format. Use ISO 8601 format.' })
      }

      if (start > end) {
        return res.status(400).json({ error: 'startDate must be before endDate' })
      }

      const statistics = await getCallStatistics(projectId, start, end)

      res.json(statistics)
    } catch (error: any) {
      console.error('[Analytics] Error getting call statistics:', error)
      res.status(500).json({ error: error.message || 'Failed to get statistics' })
    }
  })
}
