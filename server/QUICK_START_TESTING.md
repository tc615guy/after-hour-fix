# Quick Start Testing Guide ⚡

Get your OpenAI Realtime agent up and running in 5 minutes!

## 🚀 Quick Setup (5 minutes)

### 1. Start the Server
```bash
cd server
npm install  # if not already done
npm run dev
```

**Look for:** `Server running on port 8080` ✅

### 2. Check Server Health
```bash
curl http://localhost:8080/health
```

**Expected:** `{"status":"healthy",...}` ✅

### 3. Migrate Test Agent

**Option A: Via UI (Easiest)**
1. Go to `http://localhost:3000/dashboard`
2. Click a project → Settings → Assistant tab
3. Find "AI System Type" card
4. Toggle switch to "OpenAI Realtime"
5. Confirm dialog

**Option B: Via Script**
```bash
# Check what agents you have
tsx scripts/check-migration-status.ts

# Migrate an agent
tsx scripts/migrate-to-openai-realtime.ts --agent-id [YOUR_AGENT_ID]
```

### 4. Test a Call

**For Local Testing with ngrok:**
```bash
# In a new terminal
ngrok http 8080

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Update your Twilio phone number webhook to:
# https://abc123.ngrok.io/twilio/voice
```

**Then:**
1. Call your test phone number
2. Say: "Hello, I need to book an appointment"
3. Follow the conversation
4. Check server logs for activity

---

## ✅ What to Look For

### Server Logs (Good Signs ✅)
```
[Twilio] Incoming call: CAxxxxx from +1xxx to +1xxx
[Session] Created session for call CAxxxxx
[OpenAI] Connected to Realtime API
[Audio] Received audio chunk: 160 bytes
[Function Call] get_slots called
[Session] Call ended: completed
```

### Server Logs (Bad Signs ❌)
```
Error: OpenAI API key not found
Error: Database connection failed
Error: Function call failed
[Session] Call ended: failed
```

### Dashboard (Good Signs ✅)
- Badge shows "🤖 OpenAI Realtime"
- Call appears in call history
- Transcript is saved
- Duration is recorded

---

## 🧪 Quick Test Scenarios

### Test 1: Basic Call (30 seconds)
- Call the number
- Say: "Hello"
- ✅ Should respond naturally

### Test 2: Book Appointment (1 minute)
- Call the number
- Say: "I need to book an appointment for tomorrow"
- ✅ Should fetch slots and book

### Test 3: Emergency (1 minute)
- Call the number
- Say: "My pipe burst! I need help now!"
- ✅ Should detect emergency and prioritize

---

## 🔍 Quick Troubleshooting

### Call doesn't connect?
1. ✅ Server running? `curl http://localhost:8080/health`
2. ✅ Phone number `systemType` = 'openai-realtime'?
3. ✅ Agent `systemType` = 'openai-realtime'?
4. ✅ Twilio webhook URL correct?

### No audio?
1. ✅ Check server logs for audio chunks
2. ✅ Verify OpenAI API key
3. ✅ Check WebSocket connection

### Functions not working?
1. ✅ Check API endpoints are accessible
2. ✅ Look for function call errors in logs
3. ✅ Verify function definitions in `realtime-agent.ts`

---

## 📊 Quick Metrics Check

```bash
# Health status
curl http://localhost:8080/health/detailed

# Recent calls
curl http://localhost:8080/analytics/project/[PROJECT_ID]/recent
```

---

## 🎯 Success Criteria

You're ready when:
- ✅ Call connects
- ✅ You can hear AI, AI can hear you
- ✅ Functions are called (see logs)
- ✅ Call record is created in database
- ✅ Transcript is saved
- ✅ No errors in logs

---

## 📚 Full Guide

For detailed testing, see: `TESTING_GUIDE.md`

---

**Ready? Let's test!** 🚀
