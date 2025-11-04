# 🚀 Render Deployment Guide

## Overview
Deploy the OpenAI Realtime WebSocket server to Render in 5 minutes.

---

## 📋 Prerequisites

1. **Render Account**: https://render.com (you already have one!)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Environment Variables Ready**:
   - `DATABASE_URL` (from Supabase)
   - `OPENAI_API_KEY` (from OpenAI)
   - `TWILIO_ACCOUNT_SID` (from Twilio)
   - `TWILIO_AUTH_TOKEN` (from Twilio)
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)

---

## 🎯 Step-by-Step Deployment

### Step 1: Push Code to GitHub

```bash
# If not already done
git add .
git commit -m "Add OpenAI Realtime server"
git push origin main
```

### Step 2: Create New Web Service on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Render will auto-detect your repo

### Step 3: Configure the Service

**Basic Settings:**
- **Name**: `afterhourfix-realtime-server`
- **Region**: Choose closest to your users (e.g., `Oregon (US West)`)
- **Branch**: `main`
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Instance Type:**
- Select **"Starter"** ($7/month) or **"Standard"** for production

### Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these one by one:

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://[your-supabase-url]?pgbouncer=true
OPENAI_API_KEY=sk-proj-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
NEXT_PUBLIC_APP_URL=https://afterhourfix.com
```

**Important**: Make sure `DATABASE_URL` includes `?pgbouncer=true`

### Step 5: Deploy!

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repo
   - Install dependencies
   - Build TypeScript
   - Start the server
3. Wait 2-3 minutes for deployment

---

## 🌐 Get Your Production URL

After deployment completes:

1. Your service URL will be: `https://afterhourfix-realtime-server.onrender.com`
2. **Copy this URL** - you'll need it for Twilio
3. Test it: Visit `https://afterhourfix-realtime-server.onrender.com/health`
   - Should return: `{"status":"ok",...}`

---

## 📞 Step 6: Update Twilio Webhook

1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click on your phone number: **+1 (205) 751-8083**
3. Scroll to **"Voice Configuration"**
4. Set **"A CALL COMES IN"** to:
   ```
   https://afterhourfix-realtime-server.onrender.com/twilio/voice
   ```
5. Set **"STATUS CALLBACK URL"** to:
   ```
   https://afterhourfix-realtime-server.onrender.com/twilio/status
   ```
6. Click **"Save"**

---

## ✅ Step 7: Test Your Production Server

### 1. Health Check
```bash
curl https://afterhourfix-realtime-server.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "uptime": 123,
  "activeSessions": 0
}
```

### 2. Make a Test Call
1. Call your Twilio number: **+1 (205) 751-8083**
2. You should hear: "Hello, this is Big Turd Plumbing. How can I help you today?"
3. Have a conversation!
4. Try booking an appointment

### 3. Check Logs
In Render dashboard:
1. Go to your service
2. Click **"Logs"** tab
3. Look for:
   - `[Twilio] Incoming call...`
   - `[RealtimeAgent] WebSocket connected...`
   - `[RealtimeAgent] AI finished speaking...`

---

## 🔧 Troubleshooting

### Deployment Failed
- Check build logs in Render dashboard
- Verify `server/` directory structure
- Ensure `package.json` has correct scripts

### Server Starting but Calls Not Working
- Verify Twilio webhook URL is correct (no typos!)
- Check environment variables are set
- Look at Render logs for errors

### Audio Issues
- Verify `output_audio_format: 'g711_ulaw'` in code
- Check WebSocket connection in logs

### Database Connection Issues
- Ensure `?pgbouncer=true` is in `DATABASE_URL`
- Test database connection from Render shell

---

## 🎛️ Render Dashboard Features

### Logs
- Real-time logs
- Filter by severity
- Download logs

### Metrics
- CPU usage
- Memory usage
- Request count
- Response time

### Shell Access
Click **"Shell"** to access server terminal:
```bash
# Test database connection
node -e "require('./dist/db.js')"

# Check environment
env | grep DATABASE_URL
```

---

## 🔄 Auto-Deploy on Git Push

Render automatically redeploys when you push to GitHub!

```bash
# Make changes
git add .
git commit -m "Update server"
git push origin main

# Render will auto-deploy in ~2 minutes
```

---

## 💰 Costs

**Render Pricing:**
- **Free Tier**: Available but spins down after inactivity (not recommended for phone calls)
- **Starter**: $7/month (always on, 512MB RAM)
- **Standard**: $25/month (2GB RAM, better performance)

**Recommended**: **Starter** ($7/month) for production

---

## 📊 Monitoring

### Health Endpoints
- **Quick**: `GET /health`
- **Detailed**: `GET /health/detailed`

### Set Up Alerts
In Render dashboard:
1. Go to **"Notifications"**
2. Add email for deployment failures
3. Set up uptime monitoring

---

## 🚀 Production Checklist

- [ ] Code pushed to GitHub
- [ ] Render service created
- [ ] Environment variables configured
- [ ] Service deployed successfully
- [ ] Health check returns OK
- [ ] Twilio webhook updated
- [ ] Test call successful
- [ ] Audio quality verified
- [ ] Cal.com calendar connected
- [ ] Monitoring alerts configured

---

## 🆘 Support

**If you encounter issues:**

1. **Check Render Logs**: Dashboard → Your Service → Logs
2. **Test Health Endpoint**: `curl https://your-url/health`
3. **Verify Twilio Webhook**: Check Twilio console for webhook errors
4. **Review Environment Variables**: Ensure all are set correctly

**Common Issues:**
- **"Cannot reach database"** → Add `?pgbouncer=true` to DATABASE_URL
- **"WebSocket closed"** → Check OPENAI_API_KEY is valid
- **"Call hangs up"** → Verify Twilio webhook URL is correct

---

## 🎉 You're Live!

Your OpenAI Realtime server is now running in production on Render!

**Next Steps:**
1. ✅ Test with real calls
2. ✅ Connect Cal.com calendar
3. ✅ Monitor performance
4. ✅ Set up alerts
5. ✅ Scale as needed

**Your AI receptionist is now answering calls 24/7!** 📞🤖

