/**
 * ICS (iCalendar) Builder
 * Generate RFC 5545 compliant ICS files
 */

import { formatIcsDateTime, sanitizeIcsText, foldIcsLine, generateEventUid } from './utils'

export interface IcsEvent {
  uid: string
  title: string
  start: Date | string
  end: Date | string
  allDay?: boolean
  description?: string
  location?: string
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'
  transparency?: 'OPAQUE' | 'TRANSPARENT'
  created?: Date | string
  lastModified?: Date | string
  sequence?: number
}

export interface IcsOptions {
  prodId?: string
  calName?: string
  calDescription?: string
  timezone?: string
  method?: 'PUBLISH' | 'REQUEST' | 'CANCEL'
}

/**
 * Build complete ICS calendar string
 */
export function buildIcs(events: IcsEvent[], options: IcsOptions = {}): string {
  const {
    prodId = '-//AfterHourFix//Calendar 1.0//EN',
    calName = 'AfterHourFix Calendar',
    calDescription,
    timezone = 'UTC',
    method = 'PUBLISH',
  } = options

  const lines: string[] = []

  // Calendar header
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push(`PRODID:${prodId}`)
  lines.push(`METHOD:${method}`)
  lines.push(`CALSCALE:GREGORIAN`)
  lines.push(`X-WR-CALNAME:${sanitizeIcsText(calName)}`)
  
  if (calDescription) {
    lines.push(`X-WR-CALDESC:${sanitizeIcsText(calDescription)}`)
  }
  
  lines.push(`X-WR-TIMEZONE:${timezone}`)

  // Add timezone component (using UTC for simplicity)
  if (timezone === 'UTC') {
    lines.push('BEGIN:VTIMEZONE')
    lines.push('TZID:UTC')
    lines.push('BEGIN:STANDARD')
    lines.push('DTSTART:19700101T000000')
    lines.push('TZOFFSETFROM:+0000')
    lines.push('TZOFFSETTO:+0000')
    lines.push('TZNAME:UTC')
    lines.push('END:STANDARD')
    lines.push('END:VTIMEZONE')
  }

  // Add events
  for (const event of events) {
    lines.push(...buildIcsEvent(event))
  }

  // Calendar footer
  lines.push('END:VCALENDAR')

  // Join lines with CRLF and fold long lines
  return lines.map((line) => foldIcsLine(line)).join('\r\n')
}

/**
 * Build single ICS event
 */
function buildIcsEvent(event: IcsEvent): string[] {
  const lines: string[] = []
  const now = formatIcsDateTime(new Date())

  lines.push('BEGIN:VEVENT')
  lines.push(`UID:${event.uid}`)
  lines.push(`DTSTAMP:${now}`)
  
  // Date/time
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDateTime(event.start, true)}`)
    lines.push(`DTEND;VALUE=DATE:${formatIcsDateTime(event.end, true)}`)
  } else {
    lines.push(`DTSTART:${formatIcsDateTime(event.start)}`)
    lines.push(`DTEND:${formatIcsDateTime(event.end)}`)
  }

  // Required fields
  lines.push(`SUMMARY:${sanitizeIcsText(event.title)}`)
  
  // Optional fields
  if (event.description) {
    lines.push(`DESCRIPTION:${sanitizeIcsText(event.description)}`)
  }
  
  if (event.location) {
    lines.push(`LOCATION:${sanitizeIcsText(event.location)}`)
  }
  
  if (event.status) {
    lines.push(`STATUS:${event.status}`)
  }
  
  if (event.transparency) {
    lines.push(`TRANSP:${event.transparency}`)
  }
  
  if (event.created) {
    lines.push(`CREATED:${formatIcsDateTime(event.created)}`)
  }
  
  if (event.lastModified) {
    lines.push(`LAST-MODIFIED:${formatIcsDateTime(event.lastModified)}`)
  }
  
  if (event.sequence !== undefined) {
    lines.push(`SEQUENCE:${event.sequence}`)
  }

  lines.push('END:VEVENT')

  return lines
}

/**
 * Build minimal busy block (for privacy)
 */
export function buildBusyBlock(start: Date | string, end: Date | string, uid: string): IcsEvent {
  return {
    uid,
    title: 'Busy',
    start,
    end,
    allDay: false,
    status: 'CONFIRMED',
    transparency: 'OPAQUE',
  }
}

/**
 * Build detailed service booking event
 */
export function buildServiceEvent(
  booking: {
    id: string
    customerName?: string
    customerPhone?: string
    address?: string
    notes?: string
    slotStart: Date | string
    slotEnd: Date | string
    status: string
    technicianName?: string
  },
  options: {
    includeNotes?: boolean
    includePhone?: boolean
  } = {}
): IcsEvent {
  const { includeNotes = false, includePhone = false } = options

  const title = booking.customerName
    ? `Service - ${booking.customerName}`
    : 'Service Appointment'

  const descriptionParts: string[] = []
  
  if (booking.customerName) {
    descriptionParts.push(`Customer: ${booking.customerName}`)
  }
  
  if (includePhone && booking.customerPhone) {
    descriptionParts.push(`Phone: ${booking.customerPhone}`)
  }
  
  if (booking.technicianName) {
    descriptionParts.push(`Technician: ${booking.technicianName}`)
  }
  
  if (booking.status) {
    descriptionParts.push(`Status: ${booking.status}`)
  }
  
  if (includeNotes && booking.notes) {
    descriptionParts.push(`\nNotes: ${booking.notes}`)
  }

  return {
    uid: generateEventUid(booking.id),
    title,
    start: booking.slotStart,
    end: booking.slotEnd,
    allDay: false,
    description: descriptionParts.join('\n'),
    location: booking.address || undefined,
    status: booking.status === 'canceled' ? 'CANCELLED' : 'CONFIRMED',
    transparency: 'OPAQUE',
  }
}

/**
 * Parse simple ICS file (for imports)
 * Note: For production, use a proper ICS parser like ical.js or node-ical
 */
export function parseIcs(icsContent: string): Array<{
  uid?: string
  title?: string
  start?: string
  end?: string
  allDay?: boolean
  description?: string
  location?: string
}> {
  const events: Array<any> = []
  const lines = icsContent.split(/\r?\n/)

  let inEvent = false
  let currentEvent: any = {}

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()

    // Handle line folding (lines starting with space or tab are continuations)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      line += lines[i + 1].substring(1)
      i++
    }

    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
    } else if (line === 'END:VEVENT') {
      if (inEvent && currentEvent.start) {
        events.push(currentEvent)
      }
      inEvent = false
      currentEvent = {}
    } else if (inEvent) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue

      const key = line.substring(0, colonIdx)
      const value = line.substring(colonIdx + 1)

      if (key.startsWith('DTSTART')) {
        currentEvent.start = parseIcsDateTime(value, key)
        currentEvent.allDay = key.includes('VALUE=DATE')
      } else if (key.startsWith('DTEND')) {
        currentEvent.end = parseIcsDateTime(value, key)
      } else if (key === 'UID') {
        currentEvent.uid = value
      } else if (key === 'SUMMARY') {
        currentEvent.title = unescapeIcsText(value)
      } else if (key === 'DESCRIPTION') {
        currentEvent.description = unescapeIcsText(value)
      } else if (key === 'LOCATION') {
        currentEvent.location = unescapeIcsText(value)
      }
    }
  }

  return events
}

/**
 * Parse ICS datetime string to ISO
 */
function parseIcsDateTime(value: string, key?: string): string {
  // Remove TZID if present
  value = value.split(';').pop() || value

  if (value.length === 8) {
    // Date only: YYYYMMDD
    const year = value.substring(0, 4)
    const month = value.substring(4, 6)
    const day = value.substring(6, 8)
    return `${year}-${month}-${day}T00:00:00.000Z`
  } else if (value.length === 15 || value.length === 16) {
    // DateTime: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    const year = value.substring(0, 4)
    const month = value.substring(4, 6)
    const day = value.substring(6, 8)
    const hour = value.substring(9, 11)
    const minute = value.substring(11, 13)
    const second = value.substring(13, 15)
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`
  }

  return value
}

/**
 * Unescape ICS text
 */
function unescapeIcsText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

