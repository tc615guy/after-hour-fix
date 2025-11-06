/**
 * ICS Calendar Provider
 * Implements CalendarProviderInterface for ICS feeds (read-only)
 */

import { CalendarProviderInterface, NormalizedEvent, EventVisibility } from '../types'
import { withRetry, toUTC } from '../utils'
import { parseIcs } from '../ics'

export class IcsCalendarProvider implements CalendarProviderInterface {
  async listEvents(params: {
    accessToken: string // Not used for ICS, but kept for interface consistency
    calendarId?: string // ICS URL
    since: Date
    until: Date
  }): Promise<NormalizedEvent[]> {
    const { calendarId: icsUrl, since, until } = params

    if (!icsUrl) {
      throw new Error('ICS URL is required')
    }

    return withRetry(async () => {
      // Fetch the ICS file
      const response = await fetch(icsUrl, {
        headers: {
          'User-Agent': 'AfterHourFix-Calendar/1.0',
        },
      })

      if (!response.ok) {
        const error: any = new Error(`Failed to fetch ICS feed: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      const icsContent = await response.text()

      // Parse ICS content
      const events = parseIcs(icsContent)

      // Filter events within date range and normalize
      const normalized = events
        .filter((event) => {
          if (!event.start || !event.end) return false

          const eventStart = new Date(event.start)
          const eventEnd = new Date(event.end)

          return eventStart < until && eventEnd > since
        })
        .map((event) => this.normalizeEvent(event, icsUrl))

      return normalized
    })
  }

  async createEvent(): Promise<{ providerEventId: string; etag?: string }> {
    throw new Error('ICS feeds are read-only. Cannot create events.')
  }

  async updateEvent(): Promise<{ etag?: string }> {
    throw new Error('ICS feeds are read-only. Cannot update events.')
  }

  async deleteEvent(): Promise<void> {
    throw new Error('ICS feeds are read-only. Cannot delete events.')
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string
    expiresIn: number
    refreshToken?: string
  }> {
    // ICS feeds don't use OAuth
    throw new Error('ICS feeds do not use OAuth tokens')
  }

  /**
   * Normalize parsed ICS event to our format
   */
  private normalizeEvent(
    icsEvent: {
      uid?: string
      title?: string
      start?: string
      end?: string
      allDay?: boolean
      description?: string
      location?: string
    },
    icsUrl: string
  ): NormalizedEvent {
    return {
      provider: 'ics',
      providerEventId: icsEvent.uid || `${icsUrl}-${icsEvent.start}`,
      title: icsEvent.title || '(No title)',
      start: toUTC(icsEvent.start!),
      end: toUTC(icsEvent.end!),
      allDay: icsEvent.allDay || false,
      busy: true, // Assume all ICS events block time
      description: icsEvent.description || undefined,
      location: icsEvent.location || undefined,
    }
  }
}

