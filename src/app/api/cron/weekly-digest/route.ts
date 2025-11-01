import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmailAsync as sendEmail, buildWeeklyDigestEmail } from '@/lib/email'
import { subDays, startOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    // Verify cron: allow Vercel scheduled invocations (x-vercel-cron) or Authorization bearer
    const authHeader = req.headers.get('authorization')
    const isVercelCron = req.headers.get('x-vercel-cron') !== null
    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sevenDaysAgo = subDays(startOfDay(new Date()), 7)

    const projects = await prisma.project.findMany({
      include: {
        owner: true,
        agents: {
          select: { minutesThisPeriod: true },
        },
      },
    })

    for (const project of projects) {
      const [allCalls, bookings, escalatedCalls] = await Promise.all([
        prisma.call.findMany({
          where: {
            projectId: project.id,
            createdAt: { gte: sevenDaysAgo },
          },
          select: { voiceConfidence: true },
        }),
        prisma.booking.findMany({
          where: {
            projectId: project.id,
            createdAt: { gte: sevenDaysAgo },
            status: { in: ['booked', 'completed'] },
          },
          select: { priceCents: true },
        }),
        prisma.call.count({
          where: {
            projectId: project.id,
            createdAt: { gte: sevenDaysAgo },
            escalated: true,
          },
        }),
      ])

      const revenue = bookings.reduce((sum, b) => sum + (b.priceCents || 0), 0)
      const minutes = project.agents.reduce((sum, a) => sum + a.minutesThisPeriod, 0)

      // Calculate average confidence
      const confidenceScores = allCalls
        .map((c) => c.voiceConfidence)
        .filter((c) => c !== null) as number[]
      const avgConfidence = confidenceScores.length > 0
        ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length
        : 1.0

      const stats = {
        calls: allCalls.length,
        bookings: bookings.length,
        revenue,
        minutes,
        escalations: escalatedCalls,
        avgConfidence,
      }

      // Send digest email
      const emailHtml = buildWeeklyDigestEmail(project.name, stats)

      await sendEmail({
        to: project.owner.email,
        subject: `Weekly ROI Report - ${project.name}`,
        html: emailHtml,
      })

      console.log(`Sent weekly digest to ${project.owner.email} for ${project.name}`)
    }

    return NextResponse.json({
      success: true,
      projectsProcessed: projects.length,
    })
  } catch (error: any) {
    console.error('Weekly digest error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
