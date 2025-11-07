import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { requireSession, ensureProjectAccess, rateLimit, captureException } from '@/lib/api-guard'
import { audit } from '@/lib/audit'

const RowSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(4),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  address: z
    .string()
    .min(3)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  isOnCall: z.boolean().optional(),
  isActive: z.boolean().optional(),
  emergencyOnly: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
})

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return phone.trim()
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone.trim() : `+${digits}`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await rateLimit(req, `techs:import:${projectId}:${ip}`, 5, 60)
    const session = await requireSession(req)
    await ensureProjectAccess(session!.user.email || '', projectId)

    const body = await req.json()
    const rows = Array.isArray(body?.rows) ? body.rows : []
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No technician rows provided' }, { status: 400 })
    }

    let created = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (let index = 0; index < rows.length; index++) {
      const rawRow = rows[index]
      try {
        const parsed = RowSchema.parse(rawRow)
        const normalizedPhone = normalizePhone(parsed.phone)
        const phoneDigits = normalizedPhone.replace(/\D/g, '')

        const match = await prisma.technician.findFirst({
          where: {
            projectId,
            deletedAt: null,
            OR: [
              { phone: normalizedPhone },
              ...(phoneDigits
                ? [
                    { phone: { contains: phoneDigits } },
                    { phone: { contains: phoneDigits.slice(-10) } },
                  ]
                : []),
              ...(parsed.email
                ? [
                    {
                      email: {
                        equals: parsed.email,
                        mode: 'insensitive',
                      },
                    },
                  ]
                : []),
            ],
          },
        })

        const data: Record<string, any> = {
          name: parsed.name,
          phone: normalizedPhone,
        }

        if (parsed.email) data.email = parsed.email
        if (parsed.address) data.address = parsed.address
        if (typeof parsed.isOnCall === 'boolean') data.isOnCall = parsed.isOnCall
        if (typeof parsed.isActive === 'boolean') data.isActive = parsed.isActive
        if (typeof parsed.emergencyOnly === 'boolean') data.emergencyOnly = parsed.emergencyOnly
        if (typeof parsed.priority === 'number') data.priority = parsed.priority

        if (match) {
          await prisma.technician.update({ where: { id: match.id }, data })
          await audit({ projectId, type: 'technician.import.update', payload: { id: match.id, data } })
          updated++
        } else {
          const technician = await prisma.technician.create({
            data: {
              projectId,
              ...data,
              isActive: data.isActive ?? true,
              isOnCall: data.isOnCall ?? false,
              emergencyOnly: data.emergencyOnly ?? false,
              priority: data.priority ?? 0,
            },
          })
          await audit({ projectId, type: 'technician.import.create', payload: { id: technician.id, name: data.name } })
          created++
        }
      } catch (error: any) {
        skipped++
        const message = error?.message || 'Unknown error'
        errors.push(`Row ${index + 1}: ${message}`)
        captureException(error)
      }
    }

    return NextResponse.json({ created, updated, skipped, errors: errors.length ? errors : undefined })
  } catch (error: any) {
    captureException(error)
    console.error('[Technicians] Import Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to import technicians' }, { status: 500 })
  }
}

