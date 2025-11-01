import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else if (c === '\r') {
        // ignore
      } else {
        field += c
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr) return null
  // Expect MM/DD/YYYY and time like H:MM AM/PM
  const [mm, dd, yyyy] = dateStr.split('/')
  if (!mm || !dd || !yyyy) return null
  let hours = 0
  let minutes = 0
  if (timeStr) {
    const parts = timeStr.trim().split(' ')
    const hm = parts[0]?.split(':') || []
    hours = parseInt(hm[0] || '0', 10)
    minutes = parseInt(hm[1] || '0', 10)
    const ampm = (parts[1] || '').toUpperCase()
    if (ampm === 'PM' && hours < 12) hours += 12
    if (ampm === 'AM' && hours === 12) hours = 0
  }
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), hours, minutes, 0)
  return isNaN(d.getTime()) ? null : d
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
    }

    const form = await req.formData()
    const projectId = String(form.get('projectId') || '')
    const file = form.get('file') as Blob | null
    if (!projectId || !file) {
      return NextResponse.json({ error: 'Missing projectId or file' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const text = await (file as any).text()
    const table = parseCSV(text)
    if (table.length === 0) return NextResponse.json({ error: 'Empty CSV' }, { status: 400 })

    const header = table[0].map((h) => h.trim().toLowerCase())
    const idx = {
      subject: header.indexOf('subject'),
      startDate: header.indexOf('start date'),
      startTime: header.indexOf('start time'),
      endDate: header.indexOf('end date'),
      endTime: header.indexOf('end time'),
      allDay: header.indexOf('all day event'),
      description: header.indexOf('description'),
      location: header.indexOf('location'),
    }

    let created = 0
    for (let r = 1; r < table.length; r++) {
      const row = table[r]
      if (!row || row.length === 0) continue
      const start = parseDateTime(
        idx.startDate >= 0 ? row[idx.startDate] : '',
        idx.startTime >= 0 ? row[idx.startTime] : ''
      )
      const end = parseDateTime(
        idx.endDate >= 0 ? row[idx.endDate] : '',
        idx.endTime >= 0 ? row[idx.endTime] : ''
      )
      if (!start) continue

      const subject = idx.subject >= 0 ? row[idx.subject] : ''
      const description = idx.description >= 0 ? row[idx.description] : ''
      const location = idx.location >= 0 ? row[idx.location] : ''

      await prisma.booking.create({
        data: {
          projectId,
          customerName: subject?.replace(/^Service Appointment\s*-\s*/i, '') || null,
          address: location || null,
          notes: description || null,
          slotStart: start,
          slotEnd: end,
          status: 'booked',
        },
      })
      created++
    }

    return NextResponse.json({ success: true, created })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to import CSV' }, { status: 500 })
  }
}

