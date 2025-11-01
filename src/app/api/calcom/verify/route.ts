import { NextRequest, NextResponse } from 'next/server'
import { createCalComClient } from '@/lib/calcom'
import { z } from 'zod'
import { addDays } from 'date-fns'

const VerifySchema = z.object({
  apiKey: z.string(),
  username: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = VerifySchema.parse(body)

    const calcomClient = createCalComClient(input.apiKey)

    // Verify API key by getting user info
    const user = await calcomClient.getMe()

    // Get availability for next 7 days
    const username = input.username || user.username
    const from = new Date().toISOString().split('T')[0]
    const to = addDays(new Date(), 7).toISOString().split('T')[0]

    const availability = await calcomClient.getAvailability(username, from, to)

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        username: user.username,
        timeZone: user.timeZone,
      },
      availability,
    })
  } catch (error: any) {
    console.error('Cal.com verify error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
