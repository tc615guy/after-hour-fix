/**
 * Calendar Sync Types and Interfaces
 * Shared types for calendar sync functionality
 */

export type CalendarProvider = 'google' | 'microsoft' | 'ics'
export type SyncDirection = 'import' | 'export' | 'two-way'
export type EventVisibility = 'busyOnly' | 'details'
export type SyncStatus = 'ok' | 'retry' | 'error'

export interface NormalizedEvent {
  provider: CalendarProvider
  providerEventId: string
  title?: string
  start: string // ISO 8601
  end: string   // ISO 8601
  allDay?: boolean
  busy: boolean // true if should block availability
  description?: string
  location?: string
  technicianId?: string
  etag?: string
  recurrence?: string[] // RRULE if applicable
  metadata?: Record<string, unknown>
}

export interface CalendarProviderInterface {
  /**
   * List events from external calendar
   */
  listEvents(params: {
    accessToken: string
    calendarId?: string
    since: Date
    until: Date
  }): Promise<NormalizedEvent[]>

  /**
   * Create an event in external calendar
   */
  createEvent(params: {
    accessToken: string
    calendarId?: string
    event: Omit<NormalizedEvent, 'provider' | 'providerEventId'>
    visibility: EventVisibility
  }): Promise<{ providerEventId: string; etag?: string }>

  /**
   * Update an event in external calendar
   */
  updateEvent(params: {
    accessToken: string
    calendarId?: string
    providerEventId: string
    event: Partial<Omit<NormalizedEvent, 'provider' | 'providerEventId'>>
    etag?: string
    visibility: EventVisibility
  }): Promise<{ etag?: string }>

  /**
   * Delete an event from external calendar
   */
  deleteEvent(params: {
    accessToken: string
    calendarId?: string
    providerEventId: string
  }): Promise<void>

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string
    expiresIn: number
    refreshToken?: string
  }>

  /**
   * Register webhook for push notifications
   */
  registerWebhook?(params: {
    accessToken: string
    calendarId?: string
    webhookUrl: string
  }): Promise<{ channelId: string; expiry: Date }>

  /**
   * Unregister webhook
   */
  unregisterWebhook?(params: {
    accessToken: string
    channelId: string
    resourceId?: string
  }): Promise<void>
}

export interface SyncResult {
  status: SyncStatus
  summary: string
  created: number
  updated: number
  deleted: number
  skipped: number
  errors: Array<{ eventId?: string; error: string }>
}

export interface WebhookPayload {
  provider: CalendarProvider
  accountId: string
  channelId: string
  resourceId?: string
  state?: string
}

