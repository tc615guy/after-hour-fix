# Deployment Guide 🚀

## Week 4, Day 24: Deployment Documentation

This guide covers deploying the OpenAI Realtime server to production.

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or other Prisma-compatible database)
- Twilio account with credentials
- OpenAI API key
- Domain/subdomain for server (or use ngrok for testing)

---

## Environment Variables

Create a `.env` file or set these in your deployment platform:

```bash
# Server Configuration
PORT=8080
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@host:5432/database?pgbouncer=true

# OpenAI
OPENAI_API_KEY=sk-...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
MEDIA_STREAM_URL=wss://your-domain.com/twilio/stream

# Application URL (for function call URLs)
NEXT_PUBLIC_APP_URL=https://your-app-domain.com

# Alert Configuration (Optional)
ALERT_WEBHOOK_URL=https://your-webhook-url.com/alerts
ALERT_EMAIL_RECIPIENT=alerts@your-domain.com
ALERT_MIN_LEVEL=error
```

---

## Build Steps

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Run Database Migrations

```bash
npx prisma migrate deploy
```

### 4. Build TypeScript

```bash
npm run build
```

### 5. Start Server

```bash
# Production
npm start

# Development
npm run dev
```

---

## Deployment Platforms

### Railway

1. Connect your GitHub repo
2. Set environment variables in Railway dashboard
3. Railway auto-detects Node.js and runs `npm start`

### Render

1. Create new Web Service
2. Set build command: `cd server && npm install && npm run build`
3. Set start command: `cd server && npm start`
4. Add environment variables

### Fly.io

```bash
# Install flyctl
# Create fly.toml (example provided below)
fly launch
fly secrets set OPENAI_API_KEY=sk-...
fly deploy
```

Example `fly.toml`:
```toml
app = "afterhourfix-realtime"
primary_region = "iad"

[build]

[env]
  PORT = "8080"
  NODE_ENV = "production"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t afterhourfix-realtime .
docker run -p 8080:8080 --env-file .env afterhourfix-realtime
```

---

## Twilio Configuration

### 1. Configure Webhook URL

In Twilio Console:
1. Go to Phone Numbers → Manage → Active Numbers
2. Click on your phone number
3. Set Voice & Fax:
   - **A Call Comes In**: Webhook → `https://your-domain.com/twilio/voice`
   - **Status Callback**: `https://your-domain.com/twilio/status`

### 2. Media Streams URL

The `MEDIA_STREAM_URL` should point to:
```
wss://your-domain.com/twilio/stream
```

**Important**: Use `wss://` (WebSocket Secure) for HTTPS domains.

---

## Health Checks

### Quick Health Check (for load balancers)

```bash
GET /health
```

Returns: `200 OK` if server is running

### Detailed Health Check

```bash
GET /health/detailed
```

Returns full service status (database, OpenAI, Twilio)

---

## Monitoring

1. **Health Checks**: Set up monitoring on `/health` endpoint
2. **Alerts**: Configure `ALERT_WEBHOOK_URL` for error notifications
3. **Logs**: Monitor server logs for errors and warnings
4. **Metrics**: Use analytics endpoints for call metrics

---

## Scaling

### Horizontal Scaling

- Run multiple server instances behind a load balancer
- Ensure WebSocket connections are sticky (session affinity)
- Use shared database (already configured)

### Vertical Scaling

- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
- Tune database connection pool in `DATABASE_URL`

---

## Security

1. **HTTPS/WSS**: Always use secure WebSocket connections
2. **Environment Variables**: Never commit `.env` to git
3. **API Keys**: Rotate keys regularly
4. **Webhook Security**: Consider adding webhook signature validation
5. **Rate Limiting**: Add rate limiting for public endpoints

---

## Troubleshooting

See `TROUBLESHOOTING.md` for common issues and solutions.

---

## Post-Deployment Checklist

- [ ] Server starts successfully
- [ ] Health check returns `200 OK`
- [ ] Database connection works
- [ ] Twilio webhooks configured
- [ ] Media Stream URL is correct (wss://)
- [ ] Test call works end-to-end
- [ ] Alerts configured (if using)
- [ ] Monitoring set up
- [ ] Logs are accessible

---

## Rollback Plan

1. Keep previous version deployed
2. Have environment variables backed up
3. Database migrations should be reversible
4. Use blue-green deployment if possible

---

**Server is ready for production!** 🎉
