/**
 * Soft Holds System
 * 
 * Temporary reservations (60-120s TTL) for customer decision time
 * 
 * NOTE: This is a placeholder implementation. For production, consider:
 * - Using Redis for TTL-based expiration
 * - Database table for persistent holds
 * - Automatic cleanup of expired holds
 */

export interface Hold {
  token: string
  projectId: string
  start: Date
  end: Date
  capacity: number // Number of slots held
  expiresAt: Date
  customerHash?: string // Optional: hash of customer phone/email
}

// In-memory store (for development only - use Redis/database in production)
const holdsStore = new Map<string, Hold>()

/**
 * Create a soft hold for a time slot
 */
export function createHold(
  projectId: string,
  start: Date,
  end: Date,
  capacity: number = 1,
  ttlSeconds: number = 90, // Default 90 seconds
  customerHash?: string
): string {
  const token = `hold_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  
  const hold: Hold = {
    token,
    projectId,
    start,
    end,
    capacity,
    expiresAt,
    customerHash,
  }
  
  holdsStore.set(token, hold)
  
  // Auto-expire after TTL (in production, use Redis TTL or a cleanup job)
  setTimeout(() => {
    holdsStore.delete(token)
  }, ttlSeconds * 1000)
  
  return token
}

/**
 * Get a hold by token
 */
export function getHold(token: string): Hold | null {
  const hold = holdsStore.get(token)
  if (!hold) return null
  
  // Check if expired
  if (hold.expiresAt < new Date()) {
    holdsStore.delete(token)
    return null
  }
  
  return hold
}

/**
 * Release a hold (used when booking is confirmed)
 */
export function releaseHold(token: string): boolean {
  return holdsStore.delete(token)
}

/**
 * Check if a time slot has active holds
 */
export function hasActiveHold(projectId: string, start: Date, end: Date): boolean {
  const now = new Date()
  
  for (const hold of holdsStore.values()) {
    // Check if expired
    if (hold.expiresAt < now) {
      holdsStore.delete(hold.token)
      continue
    }
    
    // Check if hold overlaps with requested slot
    if (
      hold.projectId === projectId &&
      hold.start < end &&
      hold.end > start
    ) {
      return true
    }
  }
  
  return false
}

/**
 * Clean up expired holds (call periodically)
 */
export function cleanupExpiredHolds(): number {
  const now = new Date()
  let cleaned = 0
  
  for (const [token, hold] of holdsStore.entries()) {
    if (hold.expiresAt < now) {
      holdsStore.delete(token)
      cleaned++
    }
  }
  
  return cleaned
}

