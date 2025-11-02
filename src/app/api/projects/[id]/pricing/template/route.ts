import { NextRequest, NextResponse } from 'next/server'

const PRICING_TEMPLATES = {
  plumbing: [
    { service: 'Drain Cleaning', description: 'Clear clogged drains, sinks, or toilets', basePrice: 150, unit: 'flat' },
    { service: 'Water Heater Repair', description: 'Diagnose and repair water heater issues', basePrice: 200, unit: 'flat' },
    { service: 'Water Heater Installation', description: 'Full water heater replacement', basePrice: 1200, unit: 'flat' },
    { service: 'Leak Repair', description: 'Fix leaking pipes, faucets, or fixtures', basePrice: 175, unit: 'flat' },
    { service: 'Pipe Replacement', description: 'Replace damaged or old pipes', basePrice: 300, unit: 'flat' },
    { service: 'Toilet Repair', description: 'Fix running, leaking, or clogged toilets', basePrice: 125, unit: 'flat' },
    { service: 'Toilet Installation', description: 'Install new toilet', basePrice: 250, unit: 'flat' },
    { service: 'Faucet Installation', description: 'Install kitchen or bathroom faucet', basePrice: 150, unit: 'flat' },
    { service: 'Garbage Disposal Repair', description: 'Repair or replace garbage disposal', basePrice: 175, unit: 'flat' },
    { service: 'Sump Pump Service', description: 'Install or repair sump pump', basePrice: 300, unit: 'flat' },
    { service: 'Water Line Repair', description: 'Repair main water line', basePrice: 400, unit: 'flat' },
    { service: 'Sewer Line Service', description: 'Camera inspection and cleaning', basePrice: 350, unit: 'flat' },
  ],
  hvac: [
    { service: 'AC Repair', description: 'Diagnose and repair air conditioning', basePrice: 200, unit: 'flat' },
    { service: 'AC Installation', description: 'Install new AC unit', basePrice: 3500, unit: 'flat' },
    { service: 'Furnace Repair', description: 'Diagnose and repair heating system', basePrice: 200, unit: 'flat' },
    { service: 'Furnace Installation', description: 'Install new furnace', basePrice: 3000, unit: 'flat' },
    { service: 'AC Maintenance', description: 'Seasonal AC tune-up and cleaning', basePrice: 125, unit: 'flat' },
    { service: 'Furnace Maintenance', description: 'Seasonal furnace tune-up', basePrice: 125, unit: 'flat' },
    { service: 'Thermostat Installation', description: 'Install programmable thermostat', basePrice: 150, unit: 'flat' },
    { service: 'Duct Cleaning', description: 'Clean air ducts and vents', basePrice: 300, unit: 'flat' },
    { service: 'Refrigerant Recharge', description: 'Add refrigerant to AC system', basePrice: 250, unit: 'flat' },
    { service: 'Heat Pump Service', description: 'Repair or maintain heat pump', basePrice: 225, unit: 'flat' },
    { service: 'Air Filter Replacement', description: 'Replace HVAC air filters', basePrice: 75, unit: 'flat' },
    { service: 'Emergency Service', description: 'No heat/AC emergency response', basePrice: 150, unit: 'flat' },
  ],
  electrical: [
    { service: 'Outlet Installation', description: 'Install new electrical outlet', basePrice: 100, unit: 'flat' },
    { service: 'Switch Installation', description: 'Install light switch', basePrice: 85, unit: 'flat' },
    { service: 'Light Fixture Installation', description: 'Install ceiling or wall light', basePrice: 125, unit: 'flat' },
    { service: 'Ceiling Fan Installation', description: 'Install ceiling fan with light', basePrice: 175, unit: 'flat' },
    { service: 'Panel Upgrade', description: 'Upgrade electrical panel', basePrice: 1500, unit: 'flat' },
    { service: 'Circuit Breaker Replacement', description: 'Replace faulty breaker', basePrice: 150, unit: 'flat' },
    { service: 'GFCI Outlet Installation', description: 'Install ground fault outlet', basePrice: 125, unit: 'flat' },
    { service: 'Smoke Detector Installation', description: 'Install hardwired smoke detector', basePrice: 100, unit: 'flat' },
    { service: 'Electrical Troubleshooting', description: 'Diagnose electrical issues', basePrice: 125, unit: 'flat' },
    { service: 'Whole House Surge Protection', description: 'Install surge protector', basePrice: 400, unit: 'flat' },
    { service: 'EV Charger Installation', description: 'Install electric vehicle charger', basePrice: 800, unit: 'flat' },
    { service: 'Generator Installation', description: 'Install backup generator', basePrice: 3000, unit: 'flat' },
  ],
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url)
    const trade = searchParams.get('trade') || 'plumbing'
    const tradeKey = trade.toLowerCase() as keyof typeof PRICING_TEMPLATES
    
    // Get template for the trade
    const template = PRICING_TEMPLATES[tradeKey] || PRICING_TEMPLATES.plumbing
    
    // Convert to CSV format
    const csvRows = [['service', 'description', 'basePrice', 'unit']]
    template.forEach(item => {
      csvRows.push([item.service, item.description, item.basePrice.toString(), item.unit])
    })
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${trade}-pricing-template.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Template download error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
