# Calendar Sync Setup Guide

## Overview

AfterHourFix now supports comprehensive calendar sync with Google Calendar, Microsoft Outlook, and ICS feeds. This enables:

- **Import**: Block availability based on external calendar busy times
- **Export**: Push bookings to Google/Outlook calendars
- **ICS Publishing**: Generate read-only ICS feeds for universal calendar apps

---

## Environment Variables

Add these to your `.env` file:

```bash
# Calendar Encryption (Required)
# Use a strong 32+ character random string
CALENDAR_ENCRYPTION_KEY="your-strong-encryption-key-here"

# Google Calendar OAuth (Required for Google sync)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="${NEXTAUTH_URL}/api/sync/google/callback"

# Microsoft Calendar OAuth (Required for Microsoft sync)
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
MICROSOFT_REDIRECT_URI="${NEXTAUTH_URL}/api/sync/microsoft/callback"
```

---

## Setup Instructions

### 1. Database Migration

Run the Prisma migration to create calendar sync tables:

```bash
npx prisma migrate dev --name calendar_sync_foundation
npx prisma generate
```

### 2. Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Calendar API**
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://yourdomain.com/api/sync/google/callback`
5. Copy Client ID and Client Secret to `.env`

**Required Scopes:**
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/calendar.events`

### 3. Microsoft Calendar Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Create a new registration:
   - Name: AfterHourFix Calendar
   - Supported account types: Multitenant
   - Redirect URI: `https://yourdomain.com/api/sync/microsoft/callback`
4. Create a **Client Secret** under "Certificates & secrets"
5. Add API permissions:
   - Microsoft Graph > Delegated permissions
   - `Calendars.ReadWrite`
   - `offline_access`
6. Copy Application (client) ID and Client Secret to `.env`

### 4. Webhook Setup (Optional, for real-time sync)

**Google:**
- Webhooks are automatically registered when connecting
- Valid for 7 days, auto-renewed
- Webhook endpoint: `/api/webhooks/google/calendar`

**Microsoft:**
- Webhooks automatically registered
- Valid for 3 days, auto-renewed
- Webhook endpoint: `/api/webhooks/microsoft/calendar`

**Requirements:**
- Public HTTPS endpoint
- Must respond to validation requests
- Recommended: Use ngrok for local development

---

## Usage

### Connecting Calendars (User Flow)

1. Navigate to **Settings** > **Calendar**
2. Click **Connect Google** or **Connect Outlook**
3. Authorize the application
4. Configure sync direction:
   - **Import**: Block availability from external calendar
   - **Export**: Push bookings to external calendar
   - **Two-way**: Both import and export
5. Configure visibility:
   - **Busy Only**: Show as "Busy" (no details)
   - **Details**: Include customer name, phone, notes

### ICS Subscription

1. In Settings > Calendar, click **Subscribe via ICS**
2. Enter ICS URL (e.g., from Apple Calendar, Google Calendar public link)
3. Feed will be polled periodically (every 10 minutes)

### Publishing ICS Feeds

1. In Settings > Calendar, click **Create ICS Feed**
2. Configure:
   - Feed name
   - Filter by technician (optional)
   - Include notes/phone (privacy options)
3. Copy the generated URL
4. Subscribe in any calendar app:
   - **Google Calendar**: Add by URL
   - **Apple Calendar**: File > New Calendar Subscription
   - **Outlook**: Add Internet Calendar

---

## API Endpoints

### OAuth

- `GET /api/sync/google/connect` - Initiate Google OAuth
- `GET /api/sync/google/callback` - Google OAuth callback
- `GET /api/sync/microsoft/connect` - Initiate Microsoft OAuth
- `GET /api/sync/microsoft/callback` - Microsoft OAuth callback

### ICS

- `POST /api/sync/ics/subscribe` - Subscribe to ICS feed
- `GET /api/ics/[token].ics` - Public ICS feed endpoint

### Webhooks

- `POST /api/webhooks/google/calendar` - Google push notifications
- `POST /api/webhooks/microsoft/calendar` - Microsoft push notifications

---

## Data Model

### ExternalCalendarAccount
Stores OAuth tokens and connection info for each connected calendar

### CalendarMapping
Maps external calendars to projects/technicians with sync preferences

### EventMapping
Tracks bidirectional mapping between internal bookings and external events

### IcsFeed
Configuration for published ICS feeds

### SyncLog
Audit trail of all sync operations

---

## Security

### Token Encryption
- All OAuth tokens encrypted at rest using AES-256-GCM
- Uses `CALENDAR_ENCRYPTION_KEY` or falls back to `NEXTAUTH_SECRET`
- Tokens automatically refreshed before expiry

### ICS Feed Security
- URLs contain unguessable tokens (32 bytes, base64url)
- Tokens can be rotated
- Feeds can be disabled without deletion

### Least Privilege
- OAuth scopes limited to calendar read/write only
- No email or profile access beyond basic info
- Webhook signatures validated

---

## Sync Behavior

### Import (External → Internal)

1. **Polling**: Every 5-10 minutes per connected account
2. **Webhooks**: Real-time when supported (Google/Microsoft)
3. **Deduplication**: Uses provider event ID + ETag
4. **Busy Blocks**: Creates internal busy blocks to prevent double-booking

### Export (Internal → External)

1. **Triggers**: On booking create/update/cancel
2. **Visibility**: Respects user privacy settings
3. **Conflict Resolution**: Uses ETag for optimistic locking
4. **Retry**: Automatic with exponential backoff

### Rate Limiting

- Google: 1M requests/day (generous)
- Microsoft: 10K requests/10 min (generous)
- ICS: Fetched every 10 min (reduce server load)

---

## Troubleshooting

### "Token expired" errors
- Tokens auto-refresh if refresh token available
- If refresh fails, user must reconnect

### Duplicate events
- Check EventMapping table for orphaned entries
- Clear mappings if sync gets out of sync

### Webhooks not firing
- Verify public HTTPS endpoint
- Check webhook expiry dates
- Re-register webhooks if needed

### ICS feed not updating
- Check feed is enabled
- Verify bookings exist in date range
- ICS clients cache (up to 24 hours)

---

## Testing Checklist

- [ ] Connect Google Calendar successfully
- [ ] Connect Microsoft Calendar successfully
- [ ] Subscribe to ICS feed
- [ ] Import creates busy blocks
- [ ] Export creates events in external calendar
- [ ] Update booking updates external event
- [ ] Cancel booking deletes external event
- [ ] ICS feed is accessible and valid
- [ ] ICS feed opens in Apple/Google/Outlook
- [ ] Webhooks trigger sync
- [ ] Tokens refresh automatically
- [ ] Timezone handling correct
- [ ] No duplicate events after multiple syncs

---

## Cron Jobs (Optional)

For deployments without webhooks, set up cron jobs:

```bash
# Sync all calendars every 10 minutes
*/10 * * * * curl -X POST https://yourdomain.com/api/cron/calendar-sync

# Renew expiring webhooks daily
0 0 * * * curl -X POST https://yourdomain.com/api/cron/renew-webhooks
```

---

## Monitoring

Check sync logs in Admin > Sync Logs:
- View last 100 sync operations
- Filter by status (ok/error/retry)
- Inspect error payloads
- Track import/export metrics

---

## Performance Notes

- Import syncs process in batches of 2500 events
- Export syncs are async (don't block booking flow)
- ETag comparison skips unchanged events
- UTC normalization prevents timezone drift

---

## Support

For issues:
1. Check Sync Logs for errors
2. Verify ENV variables configured
3. Test OAuth manually via `/api/sync/google/connect`
4. Check webhook endpoints are publicly accessible

