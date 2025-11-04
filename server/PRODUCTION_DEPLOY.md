# 🚀 Production Deployment Guide

## Overview
This guide will help you deploy the OpenAI Realtime WebSocket server to Railway.

---

## 📋 Prerequisites

1. **Railway Account**: Sign up at https://railway.app
2. **GitHub Account**: Your code should be in a GitHub repository
3. **Environment Variables Ready**:
   - `DATABASE_URL` (from Supabase)
   - `OPENAI_API_KEY` (from OpenAI)
   - `TWILIO_ACCOUNT_SID` (from Twilio)
   - `TWILIO_AUTH_TOKEN` (from Twilio)
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL, e.g., https://afterhourfix.com)

---

## 🚂 Step 1: Deploy to Railway

### Option A: Deploy from GitHub (Recommended)

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select your `afterhourfix` repository
4. Railway will detect the `server/` directory
5. Click **"Deploy Now"**

### Option B: Deploy with Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Navigate to server directory
cd server

# Initialize and deploy
railway init
railway up
```

---

## ⚙️ Step 2: Configure Environment Variables

In Railway dashboard:

1. Go to your deployed service
2. Click **"Variables"** tab
3. Add these variables:

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://[your-supabase-connection-string]?pgbouncer=true
OPENAI_API_KEY=sk-proj-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
NEXT_PUBLIC_APP_URL=https://afterhourfix.com
```

4. Click **"Deploy"** to restart with new variables

---

## 🌐 Step 3: Get Your Production URL

After deployment:

1. Railway will give you a URL like: `https://afterhourfix-production.up.railway.app`
2. **Copy this URL** - you'll need it for Twilio

---

## 📞 Step 4: Update Twilio Webhook

1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click on your phone number
3. Update **"A CALL COMES IN"** to:
   ```
   https://[your-railway-url]/twilio/voice
   ```
4. Update **"STATUS CALLBACK URL"** to:
   ```
   https://[your-railway-url]/twilio/status
   ```
5. Click **"Save"**

---

## ✅ Step 5: Test Your Deployment

1. **Health Check**: Visit `https://[your-railway-url]/health`
   - Should return: `{"status":"ok","uptime":...}`

2. **Make a Test Call**: Call your Twilio number
   - You should hear the AI greeting
   - Test a full conversation

3. **Check Logs**: In Railway dashboard → "Deployments" → "View Logs"
   - Look for `[Twilio] Incoming call...`
   - Look for `[RealtimeAgent] WebSocket connected...`

---

## 🔧 Troubleshooting

### Call Not Connecting
- Check Railway logs for errors
- Verify Twilio webhook URL is correct
- Ensure all environment variables are set

### Audio Quality Issues
- Check `output_audio_format: 'g711_ulaw'` in code
- Verify WebSocket connection in logs

### Database Connection Issues
- Ensure `?pgbouncer=true` is in DATABASE_URL
- Check Supabase connection pooler settings

---

## 📊 Monitoring

### Railway Dashboard
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time server logs
- **Deployments**: Deployment history

### Health Checks
- **Quick**: `GET /health`
- **Detailed**: `GET /health/detailed`

---

## 🎯 Next Steps

1. ✅ Deploy server to Railway
2. ✅ Configure environment variables
3. ✅ Update Twilio webhook
4. ✅ Test production calls
5. ✅ Connect Cal.com calendar
6. ✅ Set up monitoring alerts

---

## 💰 Costs

**Railway Pricing:**
- **Hobby Plan**: $5/month (500 hours)
- **Pro Plan**: $20/month (unlimited)

**Estimated Usage:**
- Server running 24/7: ~720 hours/month
- **Recommended**: Pro Plan ($20/month)

---

## 🆘 Support

If you encounter issues:
1. Check Railway logs
2. Review Twilio webhook configuration
3. Verify environment variables
4. Test health endpoints

**Your server is now production-ready!** 🎉

