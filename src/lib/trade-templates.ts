/**
 * Trade-Specific Cal.com Event Type Templates
 *
 * Each trade has optimized default settings for appointment booking
 */

export interface TradeTemplate {
  length: number // Duration in minutes
  minimumBookingNotice: number // Minutes before appointment can be booked
  beforeEventBuffer: number // Buffer time before appointment (minutes)
  afterEventBuffer: number // Buffer time after appointment (minutes)
  description: string // Event type description
  slotInterval?: number // Time slot intervals (optional)
}

export const TRADE_TEMPLATES: Record<string, TradeTemplate> = {
  hvac: {
    length: 90, // HVAC diagnostics and repairs typically take longer
    minimumBookingNotice: 0, // Allow emergency bookings
    beforeEventBuffer: 0,
    afterEventBuffer: 30, // Extra time for cleanup, system startup checks, paperwork
    description: 'Professional HVAC service appointment. Our certified technicians provide heating, cooling, and ventilation repairs, maintenance, and installations.',
    slotInterval: 30, // 30-minute booking slots
  },

  electrical: {
    length: 60, // Standard electrical service duration
    minimumBookingNotice: 0, // Allow emergency bookings
    beforeEventBuffer: 0,
    afterEventBuffer: 20, // Time for safety checks and cleanup
    description: 'Licensed electrical service appointment. We handle wiring, panel upgrades, outlet installations, lighting, and emergency electrical repairs.',
    slotInterval: 30,
  },

  plumbing: {
    length: 75, // Plumbing jobs vary, 75 min is a good middle ground
    minimumBookingNotice: 0, // Allow emergency bookings
    beforeEventBuffer: 0,
    afterEventBuffer: 20, // Time for cleanup and testing
    description: 'Professional plumbing service appointment. Our licensed plumbers handle repairs, installations, drain cleaning, water heaters, and emergency plumbing.',
    slotInterval: 30,
  },

  // Fallback for any other trades
  default: {
    length: 60,
    minimumBookingNotice: 0,
    beforeEventBuffer: 0,
    afterEventBuffer: 15,
    description: 'Service appointment for your home or business.',
    slotInterval: 30,
  },
}

/**
 * Get trade-specific template settings
 * @param trade - The trade type (hvac, electrical, plumbing, etc.)
 * @returns TradeTemplate with optimized settings for that trade
 */
export function getTradeTemplate(trade: string): TradeTemplate {
  const normalizedTrade = trade.toLowerCase().trim()
  return TRADE_TEMPLATES[normalizedTrade] || TRADE_TEMPLATES.default
}

/**
 * Create Cal.com event type payload with trade-specific settings
 * @param projectName - Business name
 * @param trade - Trade type
 * @param userId - Cal.com user ID (optional, for OAuth)
 * @param scheduleId - Cal.com schedule ID (optional)
 * @returns Event type payload ready for Cal.com API
 */
export function createEventTypePayload(
  projectName: string,
  trade: string,
  userId?: number,
  scheduleId?: number
) {
  const template = getTradeTemplate(trade)

  const payload: any = {
    title: `${projectName} - ${trade.toUpperCase()} Service`,
    slug: `${trade.toLowerCase()}-service-${Date.now()}`,
    length: template.length,
    description: template.description,
    minimumBookingNotice: template.minimumBookingNotice,
    beforeEventBuffer: template.beforeEventBuffer,
    afterEventBuffer: template.afterEventBuffer,
  }

  // Add slot interval if specified
  if (template.slotInterval) {
    payload.slotInterval = template.slotInterval
  }

  // Add host info if provided (for API key method)
  if (userId && scheduleId) {
    payload.hosts = [
      {
        userId,
        scheduleId,
        isFixed: true,
      },
    ]
  }

  // Add schedule ID if provided (for OAuth method)
  if (scheduleId && !userId) {
    payload.scheduleId = scheduleId
  }

  return payload
}
