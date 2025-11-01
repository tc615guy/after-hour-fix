import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSV template with example data
    const csvContent = `service,description,basePrice,unit
Drain Cleaning,Clear clogged drains sinks or toilets,150,flat
Water Heater Repair,Diagnose and repair water heater issues,200,flat
Leak Repair,Fix leaking pipes faucets or fixtures,175,flat
Emergency Service Call,After-hours emergency response,100,flat
Hourly Labor Rate,Standard labor rate per hour,95,hourly`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="pricing-template.csv"',
      },
    })
  } catch (error: any) {
    console.error('Template download error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
