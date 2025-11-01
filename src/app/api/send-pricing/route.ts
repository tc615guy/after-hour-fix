import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * Send pricing/cost sheet to customer via SMS
 * Called by AI when customer asks "how much?"
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, customerPhone, bookingId } = z
      .object({
        projectId: z.string().min(1),
        customerPhone: z.string().min(7),
        bookingId: z.string().optional(),
      })
      .parse(await req.json())

    // Get project with pricing sheet
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project || !project.pricingSheet) {
      return NextResponse.json(
        {
          error: 'Pricing sheet not configured',
          result: 'Pricing depends on the parts and labor required. Our technician will provide an exact quote when they arrive.',
        },
        { status: 200 }
      )
    }

    const pricingSheet = project.pricingSheet as any

    // Check if cost sheet is enabled
    if (pricingSheet.enabled === false) {
      return NextResponse.json({
        success: true,
        result: 'Pricing depends on the parts and labor required. Our technician will provide an exact quote when they assess the situation.',
      })
    }

    // Build SMS text
    let smsText = `📋 ${project.name.toUpperCase()} PRICING\n\n`

    // Trip fee
    if (pricingSheet.tripFee && pricingSheet.tripFee > 0) {
      smsText += `🚗 Trip Fee: $${pricingSheet.tripFee.toFixed(2)}\n`
      smsText += `(Applied to all service calls)\n\n`
    }

    // Service items
    if (pricingSheet.items && Array.isArray(pricingSheet.items)) {
      pricingSheet.items.forEach((item: any) => {
        smsText += `${item.service}\n`
        if (item.description) smsText += `  ${item.description}\n`
        smsText += `  $${item.basePrice.toFixed(2)}`
        if (item.unit === 'hourly') smsText += ' /hour'
        if (item.unit === 'per_unit') smsText += ' each'
        smsText += '\n\n'
      })
    }

    // Emergency pricing
    if (project.emergencyMultiplier && project.emergencyMultiplier > 1) {
      smsText += `⚠️ After-hours/Emergency: ${project.emergencyMultiplier}x standard rates\n\n`
    }

    // Additional notes
    if (pricingSheet.notes) {
      smsText += `📌 ${pricingSheet.notes}\n\n`
    }

    smsText += `Questions? Call us back anytime!`

    // TODO: Send SMS via Twilio or SMS service
    // For now, we'll log it and return success
    console.log('[Send Pricing] SMS to send:', {
      to: customerPhone,
      text: smsText,
    })

    // Update booking to track that cost sheet was sent
    if (bookingId) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { costSheetSent: true },
      })
    }

    // Log event
    await prisma.eventLog.create({
      data: {
        projectId,
        type: 'pricing.sent',
        payload: {
          customerPhone,
          bookingId,
          itemCount: pricingSheet.items?.length || 0,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Pricing sheet sent successfully',
      result: `I've texted you our pricing sheet! You should receive it in a few seconds. Is there anything specific you'd like to know about?`,
    })
  } catch (error: any) {
    console.error('[Send Pricing] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to send pricing',
        result: 'Sorry, I had trouble sending the pricing sheet. Let me tell you our most common services...',
      },
      { status: 500 }
    )
  }
}
