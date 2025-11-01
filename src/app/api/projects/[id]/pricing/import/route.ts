import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const PricingItemSchema = z.object({
  service: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  basePrice: z.number().min(0, 'Price must be 0 or greater'),
  unit: z.enum(['flat', 'hourly', 'per_unit']).optional().default('flat'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Read file content
    const text = await file.text()
    const lines = text.split('\n').map(line => line.trim()).filter(line => line)

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 })
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim())
    const expectedHeaders = ['service', 'description', 'basePrice', 'unit']

    // Validate headers
    const hasRequiredHeaders = expectedHeaders.every(h => header.includes(h))
    if (!hasRequiredHeaders) {
      return NextResponse.json({
        error: `Invalid CSV format. Required columns: ${expectedHeaders.join(', ')}`
      }, { status: 400 })
    }

    // Parse rows
    const items: any[] = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue

      const values = line.split(',').map(v => v.trim())

      if (values.length !== header.length) {
        errors.push(`Row ${i + 1}: Column count mismatch`)
        continue
      }

      const row: any = {}
      header.forEach((key, idx) => {
        row[key] = values[idx]
      })

      // Convert basePrice to number
      const basePrice = parseFloat(row.basePrice)
      if (isNaN(basePrice)) {
        errors.push(`Row ${i + 1}: Invalid price "${row.basePrice}"`)
        continue
      }

      try {
        const item = PricingItemSchema.parse({
          service: row.service,
          description: row.description || '',
          basePrice,
          unit: row.unit || 'flat',
        })
        items.push(item)
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message}`)
      }
    }

    if (items.length === 0) {
      return NextResponse.json({
        error: 'No valid pricing items found',
        details: errors
      }, { status: 400 })
    }

    // Get existing pricing data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { pricingSheet: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const existingPricing = (project.pricingSheet as any) || {}

    // Generate IDs for new items
    const itemsWithIds = items.map((item, idx) => ({
      id: `csv-import-${Date.now()}-${idx}`,
      ...item,
      selected: false,
    }))

    // Update project with new pricing items
    await prisma.project.update({
      where: { id: projectId },
      data: {
        pricingSheet: {
          ...existingPricing,
          items: itemsWithIds,
        },
      },
    })

    return NextResponse.json({
      success: true,
      imported: items.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('CSV import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
