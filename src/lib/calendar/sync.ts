/**
 * Calendar Sync Service
 * Orchestrates import/export between external calendars and internal system
 */

import { prisma } from '../db'
import { GoogleCalendarProvider } from './providers/google'
import { MicrosoftCalendarProvider } from './providers/microsoft'
import { IcsCalendarProvider } from './providers/ics'
import { CalendarProviderInterface, NormalizedEvent, SyncResult, CalendarProvider, SyncDirection } from './types'
import { encrypt, decrypt, withRetry } from './utils'

const providers: Record<CalendarProvider, CalendarProviderInterface> = {
  google: new GoogleCalendarProvider(),
  microsoft: new MicrosoftCalendarProvider(),
  ics: new IcsCalendarProvider(),
}

/**
 * Get provider instance
 */
export function getProvider(provider: CalendarProvider): CalendarProviderInterface {
  return providers[provider]
}

/**
 * Import events from external calendar to internal system
 */
export async function importFromExternal(params: {
  userId: string
  accountId: string
  since?: Date
  until?: Date
}): Promise<SyncResult> {
  const { userId, accountId, since = new Date(), until = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } = params

  const result: SyncResult = {
    status: 'ok',
    summary: '',
    created: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    errors: [],
  }

  try {
    // Get account
    const account = await prisma.externalCalendarAccount.findUnique({
      where: { id: accountId },
      include: { calendarMappings: true },
    })

    if (!account || account.userId !== userId) {
      throw new Error('Calendar account not found')
    }

    // Get mappings with import direction
    const mappings = account.calendarMappings.filter(
      (m) => m.enabled && (m.direction === 'import' || m.direction === 'two-way')
    )

    if (mappings.length === 0) {
      result.summary = 'No active import mappings'
      return result
    }

    // Refresh token if needed
    let accessToken = account.accessToken ? decrypt(account.accessToken) : ''

    if (account.provider !== 'ics' && account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      const refreshToken = account.refreshToken ? decrypt(account.refreshToken) : ''
      const provider = getProvider(account.provider as CalendarProvider)

      const tokens = await provider.refreshAccessToken(refreshToken)

      accessToken = tokens.accessToken

      await prisma.externalCalendarAccount.update({
        where: { id: accountId },
        data: {
          accessToken: encrypt(tokens.accessToken),
          refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
          tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        },
      })
    }

    const provider = getProvider(account.provider as CalendarProvider)

    // Process each mapping
    for (const mapping of mappings) {
      try {
        const calendarId = account.provider === 'ics' ? account.icsUrl || undefined : mapping.providerCalendarId || undefined

        // Fetch external events
        const events = await provider.listEvents({
          accessToken,
          calendarId,
          since,
          until,
        })

        // Process events
        for (const event of events) {
          try {
            // Check if event already mapped
            const existing = await prisma.eventMapping.findUnique({
              where: {
                provider_providerEventId: {
                  provider: account.provider,
                  providerEventId: event.providerEventId,
                },
              },
            })

            if (existing) {
              // Check if changed (ETag)
              if (existing.providerETag && event.etag && existing.providerETag === event.etag) {
                result.skipped++
                continue
              }

              // Update existing busy block
              // Note: In a real system, you'd update your internal booking/busy block model here
              await prisma.eventMapping.update({
                where: { id: existing.id },
                data: {
                  providerETag: event.etag,
                  lastSyncedAt: new Date(),
                },
              })

              result.updated++
            } else {
              // Create new busy block
              // Note: This is where you'd create a busy block in your booking system
              // For now, we just create the mapping

              await prisma.eventMapping.create({
                data: {
                  userId,
                  projectId: mapping.projectId,
                  technicianId: mapping.technicianId || event.technicianId,
                  internalEventId: `busy-${Date.now()}-${Math.random().toString(36).slice(2)}`, // Placeholder
                  provider: account.provider,
                  providerEventId: event.providerEventId,
                  providerETag: event.etag,
                  lastSyncedAt: new Date(),
                },
              })

              result.created++
            }
          } catch (error: any) {
            result.errors.push({
              eventId: event.providerEventId,
              error: error.message,
            })
          }
        }
      } catch (error: any) {
        result.errors.push({
          error: `Mapping ${mapping.id}: ${error.message}`,
        })
      }
    }

    // Update last synced
    await prisma.externalCalendarAccount.update({
      where: { id: accountId },
      data: { lastSyncedAt: new Date() },
    })

    result.status = result.errors.length === 0 ? 'ok' : result.errors.length < result.created + result.updated ? 'retry' : 'error'
    result.summary = `Imported ${result.created} new, updated ${result.updated}, skipped ${result.skipped} events`

    // Log sync
    await prisma.syncLog.create({
      data: {
        userId,
        projectId: mappings[0]?.projectId,
        source: account.provider,
        direction: 'import',
        status: result.status,
        summary: result.summary,
        payload: { result },
      },
    })

    return result
  } catch (error: any) {
    result.status = 'error'
    result.summary = error.message
    result.errors.push({ error: error.message })

    // Log error
    await prisma.syncLog.create({
      data: {
        userId,
        source: 'system',
        direction: 'import',
        status: 'error',
        summary: error.message,
        payload: { error: error.message, stack: error.stack },
      },
    })

    return result
  }
}

/**
 * Export internal booking to external calendar
 */
export async function exportToExternal(params: {
  userId: string
  bookingId: string
  action: 'create' | 'update' | 'delete'
}): Promise<void> {
  const { userId, bookingId, action } = params

  try {
    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        project: true,
        technician: true,
      },
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    // Get export mappings for this user/project/tech
    const mappings = await prisma.calendarMapping.findMany({
      where: {
        userId,
        enabled: true,
        OR: [{ direction: 'export' }, { direction: 'two-way' }],
      },
      include: {
        account: true,
      },
    })

    if (mappings.length === 0) {
      console.log(`[Calendar] No export mappings for user ${userId}`)
      return
    }

    for (const mapping of mappings) {
      try {
        const account = mapping.account

        // Refresh token if needed
        let accessToken = account.accessToken ? decrypt(account.accessToken) : ''

        if (account.provider !== 'ics' && account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
          const refreshToken = account.refreshToken ? decrypt(account.refreshToken) : ''
          const provider = getProvider(account.provider as CalendarProvider)

          const tokens = await provider.refreshAccessToken(refreshToken)

          accessToken = tokens.accessToken

          await prisma.externalCalendarAccount.update({
            where: { id: account.id },
            data: {
              accessToken: encrypt(tokens.accessToken),
              refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
              tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
            },
          })
        }

        const provider = getProvider(account.provider as CalendarProvider)

        if (account.provider === 'ics') {
          console.log(`[Calendar] Skipping ICS export (read-only)`)
          continue
        }

        // Check if already mapped
        const eventMapping = await prisma.eventMapping.findFirst({
          where: {
            userId,
            internalEventId: bookingId,
            provider: account.provider,
          },
        })

        if (action === 'delete') {
          if (eventMapping) {
            await provider.deleteEvent({
              accessToken,
              calendarId: mapping.providerCalendarId || undefined,
              providerEventId: eventMapping.providerEventId,
            })

            await prisma.eventMapping.delete({
              where: { id: eventMapping.id },
            })
          }
        } else if (action === 'create' && !eventMapping) {
          // Create new event
          const event: Omit<NormalizedEvent, 'provider' | 'providerEventId'> = {
            title: booking.customerName ? `Service - ${booking.customerName}` : 'Service Booking',
            start: booking.slotStart!.toISOString(),
            end: booking.slotEnd!.toISOString(),
            allDay: false,
            busy: true,
            description: mapping.visibility === 'details' ? booking.notes || undefined : undefined,
            location: mapping.visibility === 'details' ? booking.address || undefined : undefined,
          }

          const { providerEventId, etag } = await provider.createEvent({
            accessToken,
            calendarId: mapping.providerCalendarId || undefined,
            event,
            visibility: mapping.visibility as 'busyOnly' | 'details',
          })

          await prisma.eventMapping.create({
            data: {
              userId,
              projectId: booking.projectId,
              technicianId: booking.technicianId,
              internalEventId: bookingId,
              provider: account.provider,
              providerEventId,
              providerETag: etag,
              lastSyncedAt: new Date(),
            },
          })
        } else if (action === 'update' && eventMapping) {
          // Update existing event
          const event: Partial<Omit<NormalizedEvent, 'provider' | 'providerEventId'>> = {
            title: booking.customerName ? `Service - ${booking.customerName}` : 'Service Booking',
            start: booking.slotStart!.toISOString(),
            end: booking.slotEnd!.toISOString(),
            description: mapping.visibility === 'details' ? booking.notes || undefined : undefined,
            location: mapping.visibility === 'details' ? booking.address || undefined : undefined,
          }

          const { etag } = await provider.updateEvent({
            accessToken,
            calendarId: mapping.providerCalendarId || undefined,
            providerEventId: eventMapping.providerEventId,
            event,
            etag: eventMapping.providerETag || undefined,
            visibility: mapping.visibility as 'busyOnly' | 'details',
          })

          await prisma.eventMapping.update({
            where: { id: eventMapping.id },
            data: {
              providerETag: etag,
              lastSyncedAt: new Date(),
            },
          })
        }

        // Log success
        await prisma.syncLog.create({
          data: {
            userId,
            projectId: booking.projectId,
            source: account.provider,
            direction: 'export',
            status: 'ok',
            summary: `${action} booking ${bookingId}`,
            payload: { bookingId, action },
          },
        })
      } catch (error: any) {
        console.error(`[Calendar] Export error for mapping ${mapping.id}:`, error)

        // Log error
        await prisma.syncLog.create({
          data: {
            userId,
            projectId: booking.projectId,
            source: mapping.account.provider,
            direction: 'export',
            status: 'error',
            summary: `Failed to ${action} booking: ${error.message}`,
            payload: { bookingId, action, error: error.message },
          },
        })
      }
    }
  } catch (error: any) {
    console.error(`[Calendar] Export error:`, error)
  }
}

/**
 * Sync all active calendars for a user
 */
export async function syncAllCalendars(userId: string): Promise<Record<string, SyncResult>> {
  const accounts = await prisma.externalCalendarAccount.findMany({
    where: { userId },
  })

  const results: Record<string, SyncResult> = {}

  for (const account of accounts) {
    try {
      const result = await importFromExternal({
        userId,
        accountId: account.id,
      })
      results[account.id] = result
    } catch (error: any) {
      results[account.id] = {
        status: 'error',
        summary: error.message,
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        errors: [{ error: error.message }],
      }
    }
  }

  return results
}

