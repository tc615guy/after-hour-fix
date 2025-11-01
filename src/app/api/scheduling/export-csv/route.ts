import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDateMMDDYYYY(d: Date) {
  const mm = pad2(d.getMonth() + 1)
  const dd = pad2(d.getDate())
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

function formatTime12h(d: Date) {
  let h = d.getHours()
  const m = pad2(d.getMinutes())
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId') || ''
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')

    const where: any = { projectId }
    if (start || end) {
      where.slotStart = {}
      if (start) where.slotStart.gte = new Date(start)
      if (end) where.slotStart.lte = new Date(end)
    }
    const source = (url.searchParams.get('source') || '').toLowerCase()
    if (source === 'ahf') {
      // Exclude imported bookings (notes contain [IMPORTED])
      // Prefer call-linked bookings as AHF-origin
      where.AND = [
        { OR: [
          { callId: { not: null } },
          { notes: { not: { contains: '[IMPORTED]' } } },
        ] }
      ]
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: [{ slotStart: 'asc' }],
      take: 1000,
    })

    const format = (url.searchParams.get('format') || '').toLowerCase()
    if (format === 'servicetitan') {
      const rows: string[] = []
      rows.push([
        'AppointmentDate','StartTimeLocal','EndTimeLocal','JobNumber','AppointmentID','Status','JobType','BusinessUnit','Technician','TechnicianID','CustomerName','CustomerPhone','CustomerEmail','ServiceAddress','City','State','Zip','EstimatedDurationMinutes','CampaignSource','Notes','CreatedAt','LastUpdatedAt'
      ].join(','))
      for (const b of bookings) {
        if (!b.slotStart) continue
        const startDate = new Date(b.slotStart)
        const endDate = b.slotEnd ? new Date(b.slotEnd) : new Date(startDate.getTime() + 120 * 60 * 1000)
        const aptIdMatch = (b.notes || '').match(/\[APTID:([^\]]+)\]/)
        const jobMatch = (b.notes || '').match(/\[JOB:([^\]]+)\]/)
        const srcMatch = (b.notes || '').match(/\[SRC:([^\]]+)\]/)
        const status = b.status === 'booked' ? 'Scheduled' : (b.status || '')
        // Attempt to split address
        let svcAddress = b.address || ''
        let city = ''
        let state = ''
        let zip = ''
        if (svcAddress.includes(',')) {
          const parts = svcAddress.split(',').map(p => p.trim())
          if (parts.length >= 2) {
            svcAddress = parts[0]
            const tail = parts.slice(1).join(', ')
            const m = tail.match(/([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)/)
            if (m) { city = m[1].trim(); state = m[2]; zip = m[3] }
          }
        }
        const durationMin = Math.max(30, Math.round((endDate.getTime() - startDate.getTime()) / 60000))
        const desc = (b.notes || '').replace(/\"/g, '""')
        rows.push([
          startDate.toISOString().slice(0,10),
          `${startDate.getHours()}:${startDate.getMinutes().toString().padStart(2,'0')}`,
          `${endDate.getHours()}:${endDate.getMinutes().toString().padStart(2,'0')}`,
          jobMatch ? jobMatch[1] : '',
          aptIdMatch ? aptIdMatch[1] : '',
          status,
          '', '', '', '',
          b.customerName || '',
          b.customerPhone || '',
          b.customerEmail || '',
          `"${(svcAddress || '').replace(/\"/g, '""')}"`,
          city,
          state,
          zip,
          String(durationMin),
          srcMatch ? srcMatch[1] : '',
          `"${desc}"`,
          (b.createdAt as any) ? new Date(b.createdAt as any).toISOString().replace('T',' ').slice(0,16) : '',
          (b.updatedAt as any) ? new Date(b.updatedAt as any).toISOString().replace('T',' ').slice(0,16) : '',
        ].join(','))
      }
      const csv = rows.join('\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="servicetitan-${projectId}.csv"`,
        },
      })
    }

    const rows: string[] = []
    // Google Calendar CSV header
    rows.push([
      'Subject',
      'Start Date',
      'Start Time',
      'End Date',
      'End Time',
      'All Day Event',
      'Description',
      'Location',
      'Private',
    ].join(','))

    for (const b of bookings) {
      if (!b.slotStart) continue
      const startDate = new Date(b.slotStart)
      const endDate = b.slotEnd ? new Date(b.slotEnd) : new Date(startDate.getTime() + 60 * 60 * 1000)
      const subject = `Service Appointment${b.customerName ? ' - ' + b.customerName : ''}`
      const desc = (b.notes || '').replace(/"/g, '""')
      const location = (b.address || '').replace(/"/g, '""')
      const line = [
        `"${subject}"`,
        formatDateMMDDYYYY(startDate),
        formatTime12h(startDate),
        formatDateMMDDYYYY(endDate),
        formatTime12h(endDate),
        'False',
        `"${desc}"`,
        `"${location}"`,
        'False',
      ].join(',')
      rows.push(line)
    }

    const csv = rows.join('\n')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="calendar-${projectId}.csv"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to export CSV' }, { status: 500 })
  }
}
