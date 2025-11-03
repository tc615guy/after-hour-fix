import { NextRequest, NextResponse } from 'next/server'

/**
 * FAST TEST ENDPOINT - Returns immediately without any external API calls
 * This is to test if Vapi tool calls are working at all
 */
export async function POST(req: NextRequest) {
  console.log('[TEST SLOTS] Called at:', new Date().toISOString())
  
  // Return immediately with mock data
  const response = {
    result: "TEST: Available times: Tomorrow at 9:00 AM, 10:00 AM, 11:00 AM",
    slots: [
      { start: "2025-11-04T14:00:00.000Z", end: null },
      { start: "2025-11-04T15:00:00.000Z", end: null },
      { start: "2025-11-04T16:00:00.000Z", end: null }
    ]
  }
  
  console.log('[TEST SLOTS] Returning:', JSON.stringify(response))
  
  return NextResponse.json(response)
}

export async function GET(req: NextRequest) {
  return POST(req)
}

