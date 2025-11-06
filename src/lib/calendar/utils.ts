/**
 * Calendar Sync Utilities
 * Encryption, retry logic, and helper functions
 */

import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.CALENDAR_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'default-key-change-me'
const ALGORITHM = 'aes-256-gcm'

/**
 * Encrypt sensitive data (tokens)
 */
export function encrypt(text: string): string {
  if (!text) return ''
  
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt sensitive data (tokens)
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) return ''
  
  try {
    const parts = encrypted.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format')
    }
    
    const [ivHex, authTagHex, encryptedText] = parts
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('[Calendar] Decryption failed:', error)
    return ''
  }
}

/**
 * Generate secure random token for ICS feeds
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url')
}

/**
 * Exponential backoff retry wrapper
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const {
    maxAttempts = 5,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    onRetry,
  } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Don't retry on 4xx errors except 429 (rate limit) and 408 (timeout)
      if (error.status && error.status >= 400 && error.status < 500) {
        if (error.status !== 429 && error.status !== 408) {
          throw error
        }
      }

      if (attempt === maxAttempts) {
        break
      }

      // Calculate delay with jitter
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      )
      const jitter = Math.random() * 0.3 * delay // +/- 30% jitter
      const actualDelay = delay + jitter

      if (onRetry) {
        onRetry(attempt, error)
      }

      console.log(`[Calendar] Retry attempt ${attempt}/${maxAttempts} after ${Math.round(actualDelay)}ms`)
      await new Promise((resolve) => setTimeout(resolve, actualDelay))
    }
  }

  throw lastError!
}

/**
 * Normalize timezone to UTC
 */
export function toUTC(date: Date | string): string {
  return new Date(date).toISOString()
}

/**
 * Check if two date ranges overlap
 */
export function rangesOverlap(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
): boolean {
  const s1 = new Date(start1).getTime()
  const e1 = new Date(end1).getTime()
  const s2 = new Date(start2).getTime()
  const e2 = new Date(end2).getTime()

  return s1 < e2 && s2 < e1
}

/**
 * Debounce function for webhook bursts
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Validate ICS URL format
 */
export function isValidIcsUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'webcal:') &&
      (url.endsWith('.ics') || url.includes('/ical/') || url.includes('/calendar'))
    )
  } catch {
    return false
  }
}

/**
 * Generate stable UID for ICS events
 */
export function generateEventUid(internalId: string, domain: string = 'afterhourfix.com'): string {
  return `${internalId}@${domain}`
}

/**
 * Format datetime for ICS (YYYYMMDDTHHMMSSZ)
 */
export function formatIcsDateTime(date: Date | string, allDay: boolean = false): string {
  const d = new Date(date)
  
  if (allDay) {
    // All-day events use YYYYMMDD format
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }
  
  // Regular events use YYYYMMDDTHHMMSSZ format (UTC)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  const seconds = String(d.getUTCSeconds()).padStart(2, '0')
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

/**
 * Sanitize text for ICS format (escape special characters)
 */
export function sanitizeIcsText(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

/**
 * Fold long ICS lines to 75 characters per RFC 5545
 */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) {
    return line
  }
  
  const lines: string[] = []
  let remaining = line
  
  while (remaining.length > 75) {
    lines.push(remaining.substring(0, 75))
    remaining = ' ' + remaining.substring(75) // Continuation lines start with space
  }
  
  if (remaining) {
    lines.push(remaining)
  }
  
  return lines.join('\r\n')
}

