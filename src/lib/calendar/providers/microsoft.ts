/**
 * Microsoft Calendar Provider
 * Implements CalendarProviderInterface for Microsoft Graph API
 */

import { CalendarProviderInterface, NormalizedEvent, EventVisibility } from '../types'
import { withRetry, toUTC } from '../utils'

const MS_GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const MS_OAUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

export class MicrosoftCalendarProvider implements CalendarProviderInterface {
  async listEvents(params: {
    accessToken: string
    calendarId?: string
    since: Date
    until: Date
  }): Promise<NormalizedEvent[]> {
    const { accessToken, calendarId, since, until } = params

    return withRetry(async () => {
      const endpoint = calendarId
        ? `${MS_GRAPH_BASE}/me/calendars/${encodeURIComponent(calendarId)}/events`
        : `${MS_GRAPH_BASE}/me/calendar/events`

      const url = new URL(endpoint)
      url.searchParams.set('$filter', `start/dateTime ge '${since.toISOString()}' and end/dateTime le '${until.toISOString()}'`)
      url.searchParams.set('$orderby', 'start/dateTime')
      url.searchParams.set('$top', '1000')
      url.searchParams.set('$select', 'id,subject,body,location,start,end,isAllDay,showAs,sensitivity,createdDateTime,lastModifiedDateTime')

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'outlook.timezone="UTC"',
        },
      })

      if (!response.ok) {
        const error: any = new Error(`Microsoft Graph API error: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      const data = await response.json()

      return (data.value || []).map((event: any) => this.normalizeEvent(event))
    })
  }

  async createEvent(params: {
    accessToken: string
    calendarId?: string
    event: Omit<NormalizedEvent, 'provider' | 'providerEventId'>
    visibility: EventVisibility
  }): Promise<{ providerEventId: string; etag?: string }> {
    const { accessToken, calendarId, event, visibility } = params

    return withRetry(async () => {
      const msEvent = this.toMicrosoftEvent(event, visibility)

      const endpoint = calendarId
        ? `${MS_GRAPH_BASE}/me/calendars/${encodeURIComponent(calendarId)}/events`
        : `${MS_GRAPH_BASE}/me/calendar/events`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'outlook.timezone="UTC"',
        },
        body: JSON.stringify(msEvent),
      })

      if (!response.ok) {
        const error: any = new Error(`Failed to create Microsoft Calendar event: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      const data = await response.json()

      return {
        providerEventId: data.id,
        etag: data['@odata.etag'],
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
    const { accessToken, calendarId, providerEventId, event, etag, visibility } = params

    return withRetry(async () => {
      const msEvent = this.toMicrosoftEvent(event, visibility)

      const endpoint = calendarId
        ? `${MS_GRAPH_BASE}/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(providerEventId)}`
        : `${MS_GRAPH_BASE}/me/calendar/events/${encodeURIComponent(providerEventId)}`

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'outlook.timezone="UTC"',
      }

      // Use ETag for optimistic concurrency control
      if (etag) {
        headers['If-Match'] = etag
      }

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(msEvent),
      })

      if (!response.ok) {
        const error: any = new Error(`Failed to update Microsoft Calendar event: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      const data = await response.json()

      return {
        etag: data['@odata.etag'],
      }
    })
  }

  async deleteEvent(params: {
    accessToken: string
    calendarId?: string
    providerEventId: string
  }): Promise<void> {
    const { accessToken, calendarId, providerEventId } = params

    return withRetry(async () => {
      const endpoint = calendarId
        ? `${MS_GRAPH_BASE}/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(providerEventId)}`
        : `${MS_GRAPH_BASE}/me/calendar/events/${encodeURIComponent(providerEventId)}`

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok && response.status !== 404) {
        // 404 is OK - event already deleted
        const error: any = new Error(`Failed to delete Microsoft Calendar event: ${response.statusText}`)
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
    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Microsoft OAuth credentials not configured')
    }

    const response = await fetch(MS_OAUTH_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'Calendars.ReadWrite offline_access',
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh Microsoft token: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token || refreshToken,
    }
  }

  async registerWebhook(params: {
    accessToken: string
    calendarId?: string
    webhookUrl: string
  }): Promise<{ channelId: string; expiry: Date }> {
    const { accessToken, calendarId, webhookUrl } = params

    const resource = calendarId
      ? `/me/calendars/${encodeURIComponent(calendarId)}/events`
      : '/me/calendar/events'

    const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days (safe margin)

    const response = await fetch(`${MS_GRAPH_BASE}/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        changeType: 'created,updated,deleted',
        notificationUrl: webhookUrl,
        resource,
        expirationDateTime: expiry.toISOString(),
        clientState: crypto.randomUUID(), // For validation
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to register Microsoft webhook: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      channelId: data.id,
      expiry: new Date(data.expirationDateTime),
    }
  }

  async unregisterWebhook(params: {
    accessToken: string
    channelId: string
  }): Promise<void> {
    const { accessToken, channelId } = params

    const response = await fetch(`${MS_GRAPH_BASE}/subscriptions/${encodeURIComponent(channelId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok && response.status !== 404) {
      console.warn(`Failed to unregister Microsoft webhook: ${response.statusText}`)
    }
  }

  /**
   * Normalize Microsoft Calendar event to our format
   */
  private normalizeEvent(msEvent: any): NormalizedEvent {
    const start = msEvent.start?.dateTime || msEvent.start
    const end = msEvent.end?.dateTime || msEvent.end
    const allDay = msEvent.isAllDay || false

    // showAs: 'free', 'tentative', 'busy', 'oof' (out of office), 'workingElsewhere', 'unknown'
    const busy = msEvent.showAs !== 'free'

    return {
      provider: 'microsoft',
      providerEventId: msEvent.id,
      title: msEvent.subject || '(No title)',
      start: toUTC(start),
      end: toUTC(end),
      allDay,
      busy,
      description: msEvent.body?.content || undefined,
      location: msEvent.location?.displayName || undefined,
      etag: msEvent['@odata.etag'],
    }
  }

  /**
   * Convert our event format to Microsoft Calendar format
   */
  private toMicrosoftEvent(event: Partial<NormalizedEvent>, visibility: EventVisibility): any {
    const msEvent: any = {}

    if (event.title !== undefined) {
      msEvent.subject = visibility === 'busyOnly' ? 'Service Booking' : event.title
    }

    if (event.start) {
      msEvent.start = {
        dateTime: event.start,
        timeZone: 'UTC',
      }
    }

    if (event.end) {
      msEvent.end = {
        dateTime: event.end,
        timeZone: 'UTC',
      }
    }

    if (event.allDay !== undefined) {
      msEvent.isAllDay = event.allDay
    }

    if (visibility === 'details') {
      if (event.description !== undefined) {
        msEvent.body = {
          contentType: 'text',
          content: event.description,
        }
      }
      if (event.location !== undefined) {
        msEvent.location = {
          displayName: event.location,
        }
      }
    }

    if (event.busy !== undefined) {
      msEvent.showAs = event.busy ? 'busy' : 'free'
    }

    return msEvent
  }
}

