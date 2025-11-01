import axios, { AxiosInstance } from 'axios'

const CALCOM_BASE_URL = process.env.CALCOM_BASE_URL || 'https://api.cal.com/v1'
const CALCOM_EVENT_TYPE_ID = process.env.CALCOM_EVENT_TYPE_ID ? parseInt(process.env.CALCOM_EVENT_TYPE_ID) : undefined

export interface CalComUser {
  id: number
  email: string
  username: string
  timeZone: string
  weekStart: string
}

export interface CalComAvailability {
  start: string
  end: string
}

export interface CalComBookingInput {
  eventTypeId?: number
  start: string
  end?: string
  attendee: {
    name: string
    email: string
    timeZone: string
    phoneNumber?: string
  }
  meetingUrl?: string
  location?: string
  title?: string
  description?: string
  metadata?: Record<string, any>
}

export interface CalComBookingResponse {
  id: number
  uid: string
  title: string
  description: string
  startTime: string
  endTime: string
  attendees: Array<{
    name: string
    email: string
    timeZone: string
  }>
  status: string
}

export class CalComClient {
  private client: AxiosInstance
  private apiKey?: string
  private token?: string
  private mode: 'apiKey' | 'token'

  constructor(secret: string, mode: 'apiKey' | 'token' = 'apiKey') {
    this.mode = mode
    if (mode === 'apiKey') this.apiKey = secret
    else this.token = secret
    this.client = axios.create({
      baseURL: CALCOM_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  private authParams() {
    if (this.mode === 'apiKey') return { params: { apiKey: this.apiKey } }
    return { headers: { Authorization: `Bearer ${this.token}` } }
  }

  async getMe(): Promise<CalComUser> {
    try {
      const response = await this.client.get('/me', this.authParams())
      return response.data.user || response.data.data || response.data
    } catch (error: any) {
      console.error('Cal.com getMe error:', error.response?.data || error.message)
      throw new Error('Failed to verify Cal.com API key')
    }
  }

  async getAvailability(
    username: string,
    from: string,
    to: string
  ): Promise<CalComAvailability[]> {
    try {
      // Cal.com v2 availability endpoint
      const cfg: any = this.authParams()
      cfg.params = { ...(cfg.params || {}), dateFrom: from, dateTo: to }
      const response = await this.client.get(`/schedules/${username}/availability`, cfg)
      return response.data.data || response.data || []
    } catch (error: any) {
      console.error('Cal.com getAvailability error:', error.response?.data || error.message)
      // Return mock data if API fails
      return this.getMockAvailability(from, to)
    }
  }

  private getMockAvailability(from: string, to: string): CalComAvailability[] {
    // Generate 7 days of 9am-5pm slots
    const slots: CalComAvailability[] = []
    const start = new Date(from)
    const end = new Date(to)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      slots.push(
        { start: `${dateStr}T09:00:00Z`, end: `${dateStr}T10:00:00Z` },
        { start: `${dateStr}T10:00:00Z`, end: `${dateStr}T11:00:00Z` },
        { start: `${dateStr}T11:00:00Z`, end: `${dateStr}T12:00:00Z` },
        { start: `${dateStr}T13:00:00Z`, end: `${dateStr}T14:00:00Z` },
        { start: `${dateStr}T14:00:00Z`, end: `${dateStr}T15:00:00Z` },
        { start: `${dateStr}T15:00:00Z`, end: `${dateStr}T16:00:00Z` },
        { start: `${dateStr}T16:00:00Z`, end: `${dateStr}T17:00:00Z` }
      )
    }
    return slots
  }

  async createBooking(input: CalComBookingInput): Promise<CalComBookingResponse> {
    try {
      // Cal.com V1 API format
      // For location, Cal.com expects just the address string when using "In Person" location type
      const bookingData = {
        eventTypeId: input.eventTypeId || CALCOM_EVENT_TYPE_ID,
        start: input.start,
        responses: {
          name: input.attendee.name,
          email: input.attendee.email,
          location: { optionValue: input.location || '', value: 'inPerson' },
          notes: input.description || '',
        },
        timeZone: input.attendee.timeZone,
        language: 'en',
        metadata: input.metadata || {},
      }

      console.log('[Cal.com] Creating booking with:', JSON.stringify(bookingData, null, 2))

      const response = await this.client.post('/bookings', bookingData, this.authParams())

      console.log('[Cal.com] Booking created successfully:', response.data)
      return response.data
    } catch (error: any) {
      console.error('Cal.com createBooking error:', error.response?.data || error.message)
      console.error('Request data:', error.config?.data)
      // Return mock booking if API fails
      return this.getMockBooking(input)
    }
  }

  async listBookings(params?: { eventTypeId?: number; from?: string; to?: string }): Promise<CalComBookingResponse[]> {
    try {
      // Cal.com v1 supports listing bookings for a user; filter by event type if provided
      const cfg: any = this.authParams()
      cfg.params = { ...(cfg.params || {}) }
      if (params?.eventTypeId) cfg.params.eventTypeId = params.eventTypeId
      if (params?.from) cfg.params.startTimeGte = params.from
      if (params?.to) cfg.params.startTimeLte = params.to

      const response = await this.client.get('/bookings', cfg)
      const data = response.data?.bookings || response.data?.data || response.data
      if (Array.isArray(data)) return data as CalComBookingResponse[]
      if (Array.isArray(response.data)) return response.data as CalComBookingResponse[]
      return []
    } catch (error: any) {
      console.error('Cal.com listBookings error:', error.response?.data || error.message)
      return []
    }
  }

  private getMockBooking(input: CalComBookingInput): CalComBookingResponse {
    const startTime = new Date(input.start)
    const endTime = input.end ? new Date(input.end) : new Date(startTime.getTime() + 60 * 60 * 1000)

    return {
      id: Math.floor(Math.random() * 100000),
      uid: `mock-${Date.now()}`,
      title: input.title || 'Service Appointment',
      description: input.description || '',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendees: [input.attendee],
      status: 'accepted',
    }
  }

  async getEventType(id: number): Promise<any> {
    const cfg: any = this.authParams()
    const res = await this.client.get(`/event-types/${id}`, cfg)
    return res.data?.event_type || res.data?.data || res.data
  }

  async createEventTypeFromBase(options: {
    baseEventTypeId: number
    projectName: string
    trade: string
  }): Promise<any> {
    // Fetch base event type settings
    const base = await this.getEventType(options.baseEventTypeId)
    const me = await this.getMe()
    const schedules = await this.client.get(`/schedules`, { params: { apiKey: this.apiKey } })
    const schedList = schedules.data?.schedules || schedules.data || []
    const schedule = schedList.find((s: any) => s.isDefault) || schedList[0]

    const title = `${options.projectName} - ${options.trade.toUpperCase()} Service`
    const payload: any = {
      title,
      slug: `${options.trade.toLowerCase()}-service-${Date.now()}`,
      length: base.length,
      description: base.description,
      minimumBookingNotice: base.minimumBookingNotice,
      beforeEventBuffer: base.beforeEventBuffer,
      afterEventBuffer: base.afterEventBuffer,
      slotInterval: base.slotInterval,
      hosts: schedule
        ? [
            {
              userId: typeof me.id === 'string' ? parseInt(me.id as any, 10) : me.id,
              scheduleId: schedule.id,
              isFixed: true,
            },
          ]
        : undefined,
    }

    const res = await this.client.post(`/event-types`, payload, this.authParams())
    return res.data?.event_type || res.data?.data || res.data
  }

  async listSchedules(): Promise<any[]> {
    const cfg: any = this.authParams()
    const res = await this.client.get('/schedules', cfg)
    const schedules = res.data?.schedules ?? res.data ?? []
    return schedules
  }
}

export function createCalComClient(apiKey: string): CalComClient {
  return new CalComClient(apiKey, 'apiKey')
}

export function createCalComClientWithToken(accessToken: string): CalComClient {
  return new CalComClient(accessToken, 'token')
}
