/**
 * Google Calendar Provider
 * Implements CalendarProviderInterface for Google Calendar API v3
 */

import { CalendarProviderInterface, NormalizedEvent, EventVisibility } from '../types'
import { withRetry, toUTC } from '../utils'

const GOOGLE_API_BASE = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_OAUTH_BASE = 'https://oauth2.googleapis.com/token'

export class GoogleCalendarProvider implements CalendarProviderInterface {
  async listEvents(params: {
    accessToken: string
    calendarId?: string
    since: Date
    until: Date
  }): Promise<NormalizedEvent[]> {
    const { accessToken, calendarId = 'primary', since, until } = params

    return withRetry(async () => {
      const url = new URL(`${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`)
      url.searchParams.set('timeMin', since.toISOString())
      url.searchParams.set('timeMax', until.toISOString())
      url.searchParams.set('singleEvents', 'true') // Expand recurring events
      url.searchParams.set('orderBy', 'startTime')
      url.searchParams.set('maxResults', '2500')

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error: any = new Error(`Google Calendar API error: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      const data = await response.json()

      return (data.items || []).map((event: any) => this.normalizeEvent(event))
    })
  }

  async createEvent(params: {
    accessToken: string
    calendarId?: string
    event: Omit<NormalizedEvent, 'provider' | 'providerEventId'>
    visibility: EventVisibility
  }): Promise<{ providerEventId: string; etag?: string }> {
    const { accessToken, calendarId = 'primary', event, visibility } = params

    return withRetry(async () => {
      const googleEvent = this.toGoogleEvent(event, visibility)

      const response = await fetch(
        `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        }
      )

      if (!response.ok) {
        const error: any = new Error(`Failed to create Google Calendar event: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      const data = await response.json()

      return {
        providerEventId: data.id,
        etag: data.etag,
      }
    })
  }

  async updateEvent(params: {
    accessToken: string
    calendarId?: string
    providerEventId: string
    event: Partial<Omit<NormalizedEvent, 'provider' | 'providerEventId'>>
    etag?: string
    visibility: EventVisibility
  }): Promise<{ etag?: string }> {
    const { accessToken, calendarId = 'primary', providerEventId, event, etag, visibility } = params

    return withRetry(async () => {
      const googleEvent = this.toGoogleEvent(event, visibility)

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }

      // Use ETag for optimistic concurrency control
      if (etag) {
        headers['If-Match'] = etag
      }

      const response = await fetch(
        `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(providerEventId)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(googleEvent),
        }
      )

      if (!response.ok) {
        const error: any = new Error(`Failed to update Google Calendar event: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      const data = await response.json()

      return {
        etag: data.etag,
      }
    })
  }

  async deleteEvent(params: {
    accessToken: string
    calendarId?: string
    providerEventId: string
  }): Promise<void> {
    const { accessToken, calendarId = 'primary', providerEventId } = params

    return withRetry(async () => {
      const response = await fetch(
        `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(providerEventId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok && response.status !== 404) {
        // 404 is OK - event already deleted
        const error: any = new Error(`Failed to delete Google Calendar event: ${response.statusText}`)
        error.status = response.status
        throw error
      }
    })
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string
    expiresIn: number
    refreshToken?: string
  }> {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured')
    }

    const response = await fetch(GOOGLE_OAUTH_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh Google token: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token || refreshToken, // Google may issue new refresh token
    }
  }

  async registerWebhook(params: {
    accessToken: string
    calendarId?: string
    webhookUrl: string
  }): Promise<{ channelId: string; expiry: Date }> {
    const { accessToken, calendarId = 'primary', webhookUrl } = params

    const channelId = crypto.randomUUID()
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days (Google max)

    const response = await fetch(
      `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          expiration: expiry.getTime(),
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to register Google webhook: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      channelId: data.id,
      expiry: new Date(parseInt(data.expiration)),
    }
  }

  async unregisterWebhook(params: {
    accessToken: string
    channelId: string
    resourceId?: string
  }): Promise<void> {
    const { accessToken, channelId, resourceId } = params

    if (!resourceId) {
      console.warn('[Google] Cannot unregister webhook without resourceId')
      return
    }

    const response = await fetch(`${GOOGLE_API_BASE}/channels/stop`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        resourceId,
      }),
    })

    if (!response.ok && response.status !== 404) {
      console.warn(`Failed to unregister Google webhook: ${response.statusText}`)
    }
  }

  /**
   * Normalize Google Calendar event to our format
   */
  private normalizeEvent(googleEvent: any): NormalizedEvent {
    const start = googleEvent.start?.dateTime || googleEvent.start?.date
    const end = googleEvent.end?.dateTime || googleEvent.end?.date
    const allDay = !googleEvent.start?.dateTime

    return {
      provider: 'google',
      providerEventId: googleEvent.id,
      title: googleEvent.summary || '(No title)',
      start: toUTC(start),
      end: toUTC(end),
      allDay,
      busy: googleEvent.transparency !== 'transparent',
      description: googleEvent.description || undefined,
      location: googleEvent.location || undefined,
      etag: googleEvent.etag,
    }
  }

  /**
   * Convert our event format to Google Calendar format
   */
  private toGoogleEvent(event: Partial<NormalizedEvent>, visibility: EventVisibility): any {
    const googleEvent: any = {}

    if (event.title !== undefined) {
      googleEvent.summary = visibility === 'busyOnly' ? 'Service Booking' : event.title
    }

    if (event.start) {
      if (event.allDay) {
        googleEvent.start = { date: event.start.split('T')[0] }
      } else {
        googleEvent.start = { dateTime: event.start, timeZone: 'UTC' }
      }
    }

    if (event.end) {
      if (event.allDay) {
        googleEvent.end = { date: event.end.split('T')[0] }
      } else {
        googleEvent.end = { dateTime: event.end, timeZone: 'UTC' }
      }
    }

    if (visibility === 'details') {
      if (event.description !== undefined) {
        googleEvent.description = event.description
      }
      if (event.location !== undefined) {
        googleEvent.location = event.location
      }
    }

    if (event.busy !== undefined) {
      googleEvent.transparency = event.busy ? 'opaque' : 'transparent'
    }

    return googleEvent
  }
}

