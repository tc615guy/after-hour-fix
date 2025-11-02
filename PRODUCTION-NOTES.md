# Production Notes

This document summarizes required .env settings and app behavior changes to review before pushing to production. It also captures the recent changes added to the app for numbers, pricing sync, and CSV import polish.

## Environment Checklist

- NEXT_PUBLIC_APP_URL
  - Production: must be an HTTPS URL (for example, `https://app.yourdomain.com`).
  - Why: Assistant tools (including `get_pricing`) only attach on secure origins in production. HTTP is allowed only for local development.
  - Local dev: `http://localhost:<port>` is permitted (temporary convenience).

- NODE_ENV
  - Set to `production` in production.
  - In development, assistant tools are allowed on non-HTTPS localhost as a convenience. In production, non-HTTPS disables tools.

- ENABLE_MOCK_MODE
  - Production: set to `false`.
  - Dev: can be `true` to allow mock responses when external services are not configured.

- VAPI_API_KEY
  - Required. Set to your Vapi production API key.

- VAPI_WEBHOOK_URL
  - Production: use an HTTPS URL (for example, `https://app.yourdomain.com/api/vapi/webhook`).

- SKIP_WEBHOOK_VERIFICATION
  - Production: `false`.
  - Dev: may be `true` for fast local iteration.

- Stripe keys (STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  - Use live keys in production; test keys only in dev.

- CALCOM_* settings
  - Verify `CALCOM_EVENT_TYPE_ID` and OAuth redirect(s) are aligned to your production domain (see comments in `.env`).

- Logging/Monitoring (optional)
  - Sentry DSN (`NEXT_PUBLIC_SENTRY_DSN`) to enable error tracking. Optionally set `SENTRY_TRACES_SAMPLE_RATE`.

- Queue / Background jobs (optional but recommended for scale)
  - To enable BullMQ: set `BULLMQ_ENABLED=true` and `REDIS_URL=redis://...`. Start worker with `npm run worker`.
  - If you prefer serverless/no-installs: use Upstash REST (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`).
  - Email jobs use queue `emails` with job name `email.send`.

## App Behavior Changes

- Assistant tools in dev vs. prod
  - Dev: Tools (including `get_pricing`) are allowed over `http://localhost` or when `NODE_ENV` is not `production`.
  - Prod: Tools require HTTPS. If `NEXT_PUBLIC_APP_URL` is not HTTPS, the assistant tools are disabled.

- Numbers
  - Settings → Numbers and Dashboard now surface a “Purchase Number” action if the project has no number. The purchase attaches the number to the latest assistant and persists it to the project.
  - Phone number purchase automatically includes: `serverUrl` (webhook endpoint), `serverUrlSecret` (auth), and `fallbackDestination` (project's forwarding number if set).

- Pricing → “Push to Assistant” (fast path)
  - A concise pricing summary (trip fee, up to 25 services, emergency multiplier, and notes) is appended to the assistant’s system prompt and synced to Vapi.
  - The assistant tools now include a `get_pricing` function that returns the current pricing sheet at runtime.

- CSV Import Polish (Dashboard → Bookings)
  - Added “Import (Preview)” to map CSV columns before import.
  - Shows a first‑rows preview and lets you map columns to fields.
  - Imports with row‑level error reporting; successful rows are created while failed rows are listed (not aborting the whole file).

- Auth & Rate Limiting
  - Sensitive APIs now require a Supabase session and project ownership; admin middleware remains for `/api/admin/*`.
  - Rate limiting is enabled per-IP/per-resource (Upstash REST when configured; dev fallback in-memory).
  - Supabase magic link flow: `/auth/login` sends a link and `/auth/callback` exchanges code for a session and sets `sb-access-token` cookie used by server checks.

- Zod Validation
  - API inputs are validated (most routes). Technicians endpoints now enforce input schemas.

- Pagination
  - Calls and Bookings endpoints support cursor-based pagination with `limit` and `cursor` params and return `nextCursor`.

- Soft Deletes & Audit Logs
  - Core models support `deletedAt`; queries filter deleted by default.
  - Audit events are recorded for technician create/update/delete.

- Sentry
  - Config files added for client/server/edge. Set DSN to enable. Instrumentation is auto-registered.
  - Source maps upload: `next.config.js` wraps with `withSentryConfig`. Set env `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in CI to upload during build.

- Queue
  - Queue facade prefers BullMQ, falls back to Upstash REST, then logs. Worker processes `email.send`.
  - Booking imports queue: `bookings.import` and `bookings.importBatch`. API supports `?async=1` to enqueue and return 202.
  - Numbers sync queue: `numbers.sync`. API supports `?async=1` to enqueue and return 202.
  - Job status tracking: `ImportJob` table records `queued|processing|completed|failed` with progress. Poll via `GET /api/jobs/:id` (auth enforced by project ownership).
  - Worker process: use PM2 with `ecosystem.config.js` or a Procfile (`worker: npm run worker`).

## Phone Number Configuration

### Demo Assistants
The following demo assistants are pre-configured for testing:
- **Demo Plumbing**: ID `66ac9a80-cee3-4084-95fa-c51ede8ccf5c`, Number `+19168664042`
- **Demo HVAC**: ID `ee143a79-7d18-451f-ae8e-c1e78c83fa0f`, Number `+14702936031`
- **Demo Electrical**: ID `fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5`, Number `+13414419066`

### Phone Number Setup
When purchasing or syncing phone numbers:
1. Numbers are automatically attached to their project's assistant
2. Webhook configuration is set: `https://afterhourfix.com/api/vapi/webhook`
3. Fallback forwarding is set to the project's `forwardingNumber` if configured
4. Use Settings → Phone Numbers → "Sync from Vapi" to update database

## Production Validation Steps

1) Confirm HTTPS for `NEXT_PUBLIC_APP_URL` and that assistant tools are attached (inspect the assistant config or logs).
2) Verify Vapi credentials and webhook URL use HTTPS.
3) Attempt "Push to Assistant" from Pricing and confirm the prompt updates and tools are present.
4) Purchase a number (on a test project) and place a test call.
5) Try CSV "Import (Preview)": map columns, import, and confirm row‑level error reporting and partial success behavior.
6) Trigger an email (booking confirmation) and verify it is enqueued and processed by the worker (BullMQ), or sent directly if queue disabled.
7) Verify Sentry receives a test error and traces.
8) For large imports, visit `/jobs/:id` to see live progress.
9) Test demo assistants: verify all three demo numbers can receive calls and book appointments.
