# AfterHourFix

AI receptionist SaaS for trades (plumbing, HVAC, locksmith, towing) that answers calls 24/7, books jobs via Cal.com, and sends confirmations.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: Supabase Postgres (multitenant)
- **Payments**: Stripe (subscriptions)
- **Voice AI**: Vapi.ai (Twilio numbers)
- **Calendar**: Cal.com API (ONLY - no Google Calendar)
- **Email**: Resend or Postmark

## Features

- 24/7 AI call answering and booking
- Cal.com calendar integration
- Stripe subscription management (Starter $149, Pro $299)
- Real-time call transcripts and intent detection
- SMS/Email confirmations
- Weekly ROI digest emails
- Multitenant security with RLS

## Quick Start

### 1. Clone and Install

```bash
git clone <repo>
cd afterhourfix
npm install
```

### 2. Environment Setup

Copy `.env.local.example` to `.env.local` and fill in your API keys:

```bash
cp .env.local.example .env.local
```

Required keys:
- Supabase: URL, anon key, service role key
- Stripe: secret key, webhook secret, price IDs
- Vapi: API key
- Cal.com: Base URL (https://api.cal.com/v2)
- Resend: API key

### 3. Database Setup

```bash
# Create database URL in .env.local
DATABASE_URL="postgresql://..."

# Run migrations
npx prisma migrate dev

# Seed demo data
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Onboarding Flow

1. **Pick Trade & Business Info** - Select trade type and business name
2. **Connect Cal.com** - Enter Cal.com API token, verify availability
3. **Create Vapi Assistant** - Auto-generates AI assistant with custom prompt
4. **Buy/Attach Number** - Purchase phone number via Vapi

## API Routes

- `POST /api/stripe/webhook` - Stripe subscription events
- `POST /api/vapi/webhook` - Vapi call lifecycle events
- `POST /api/book` - Create Cal.com booking (called by Vapi tool)
- `POST /api/notify` - Send SMS/email confirmations
- `POST /api/agents` - Create Vapi assistant
- `POST /api/numbers` - Purchase Vapi phone number
- `GET /api/cron/weekly-digest` - Weekly ROI email (Vercel cron)

## Project Structure

```
src/
├── app/
│   ├── api/                  # API routes
│   ├── auth/                 # Auth pages
│   ├── dashboard/            # Main dashboard
│   ├── onboarding/           # 4-step wizard
│   ├── projects/[id]/        # Project-specific pages
│   ├── pricing/              # Pricing page
│   ├── faq/                  # FAQ page
│   ├── privacy/              # Privacy policy
│   └── terms/                # Terms of service
├── components/
│   └── ui/                   # shadcn/ui components
└── lib/
    ├── calcom.ts             # Cal.com client
    ├── vapi.ts               # Vapi client
    ├── stripe.ts             # Stripe helpers
    ├── email.ts              # Email sender
    ├── db.ts                 # Prisma client
    └── supabase/             # Supabase auth
```

## Deployment

### Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Database Migrations

```bash
npx prisma migrate deploy
```

### Webhooks

Set up webhooks in external services:

- **Stripe**: `https://yourdomain.com/api/stripe/webhook`
- **Vapi**: `https://yourdomain.com/api/vapi/webhook`

## Weekly Digest Cron

Configured in `vercel.json` to run every Monday at 9am:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

Set `CRON_SECRET` in your environment variables.

## Troubleshooting

### Missing API Keys

If any API key is missing, the app will:
- Boot successfully
- Show stub/mock data
- Log warnings to console

This allows development without all external services configured.

### Cal.com Connection Issues

- Verify API token at [Cal.com Settings](https://app.cal.com/settings/developer/api-keys)
- Check that your Cal.com account has available event types
- Ensure timezone matches your Cal.com settings

### Vapi Assistant Not Working

- Confirm `VAPI_API_KEY` is set
- Check Vapi dashboard for assistant creation
- Verify webhook URL is publicly accessible

## Support

Email: support@afterhourfix.com

## License

Proprietary - All rights reserved
