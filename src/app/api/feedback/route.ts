import { NextRequest, NextResponse } from 'next/server'
import { processFeedbackResponse } from '@/lib/ai-learning/customer-feedback'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, rating, comment } = body

    if (!token || !rating) {
      return NextResponse.json({ error: 'Token and rating required' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const success = await processFeedbackResponse(token, rating, comment)

    if (!success) {
      return NextResponse.json({ error: 'Failed to process feedback' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Thank you for your feedback!'
    })
  } catch (error: any) {
    console.error('[Feedback API] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to submit feedback' 
    }, { status: 500 })
  }
}

