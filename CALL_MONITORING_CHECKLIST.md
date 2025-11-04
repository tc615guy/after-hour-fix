# 📞 Call Monitoring Checklist - Real-Time Log Watching

## ✅ Pre-Call Checklist

Before you make the call, verify:
- [ ] Server is running (health check passed)
- [ ] ngrok is forwarding correctly
- [ ] Twilio webhook is configured
- [ ] Server terminal window is visible for log watching

---

## 📋 What to Watch For (In Order)

When you make a call, you should see these logs **in sequence**:

### 1. **Twilio Webhook Received** ✅
```
[Twilio] Incoming call: CAxxxxx from +1234567890 to +1987654321
```
**What this means:** Twilio sent the call to your server. ✅ GOOD

---

### 2. **Phone Number Lookup** ✅
```
[Twilio] Found project: Your Project Name, agent: Your Agent Name (OpenAI Realtime)
```
**What this means:** Server found your phone number and agent in database. ✅ GOOD

**If you see this instead:**
```
[Twilio] Phone number not found: +1987654321
```
**Problem:** Phone number not in database or wrong format. ❌ FIX NEEDED

---

### 3. **Session Created** ✅
```
[SessionManager] Creating session for call CAxxxxx...
[SessionManager] Call record created: call_xxxxx
```
**What this means:** Server created a call session and database record. ✅ GOOD

---

### 4. **Media Stream Connected** ✅
```
[MediaStream] New WebSocket connection for call CAxxxxx
[MediaStream] Stream connected for call CAxxxxx
```
**What this means:** Twilio Media Stream WebSocket connected. ✅ GOOD

---

### 5. **Realtime Agent Connected** ✅
```
[SessionManager] Initializing Realtime agent for call CAxxxxx
[RealtimeAgent] WebSocket connected to OpenAI
[RealtimeAgent] Session created: sess_xxxxx
```
**What this means:** OpenAI Realtime API connection established. ✅ GOOD

---

### 6. **Audio Converter Ready** ✅
```
[SessionManager] Audio converter ready for call CAxxxxx
```
**What this means:** Audio conversion is working (μ-law ↔ PCM). ✅ GOOD

---

### 7. **Audio Flowing** ✅
```
[MediaStream] Received audio for call CAxxxxx
[RealtimeAgent] Sending audio to OpenAI...
[RealtimeAgent] Received audio from OpenAI...
[SessionManager] Forwarding audio to Twilio...
```
**What this means:** Audio is flowing both ways! 🎉 CONVERSATION WORKING

---

### 8. **Function Calls (If Needed)** ✅
```
[SessionManager] Function call: get_slots
[SessionManager] Function call completed: get_slots
```
**What this means:** AI is calling functions (booking, pricing, etc.). ✅ WORKING

---

### 9. **Call Ended** ✅
```
[Twilio] Call status update: CAxxxxx -> completed
[SessionManager] Ending session for call CAxxxxx
[SessionManager] Session ended, metrics: {...}
```
**What this means:** Call completed successfully. ✅ SUCCESS

---

## ❌ Common Errors to Watch For

### **Error: Phone number not found**
```
[Twilio] Phone number not found: +1987654321
```
**Fix:** Check phone number format in database (must be E.164: `+1234567890`)

---

### **Error: No agent configured**
```
[Twilio] No agent found for project: proj_xxxxx
```
**Fix:** Make sure project has an agent with `systemType: 'openai-realtime'`

---

### **Error: Wrong system type**
```
[Twilio] Call routed to Vapi system. Agent: vapi, Phone: vapi
```
**Fix:** Update agent `systemType` to `'openai-realtime'` in database

---

### **Error: Audio converter not ready**
```
[MediaStream] Audio converter not ready for call CAxxxxx
```
**Fix:** This is usually temporary. If it persists, check audio conversion setup.

---

### **Error: WebSocket connection failed**
```
[RealtimeAgent] WebSocket error: ...
[RealtimeAgent] Failed to connect to OpenAI
```
**Fix:** Check `OPENAI_API_KEY` in `server/.env`

---

### **Error: Database connection failed**
```
Can't reach database server at...
```
**Fix:** Check `DATABASE_URL` in `server/.env`

---

## 🎯 Quick Success Indicators

**Everything is working if you see:**
1. ✅ `[Twilio] Incoming call...` (within 2-3 seconds)
2. ✅ `[MediaStream] Stream connected...` (within 3-5 seconds)
3. ✅ `[RealtimeAgent] Session created...` (within 5-7 seconds)
4. ✅ Audio flowing messages (continuous during call)
5. ✅ `[Twilio] Call status update: ... -> completed` (when call ends)

---

## 📊 Performance Metrics to Note

After the call ends, look for:
```
[SessionManager] Session ended, metrics: {
  duration: 120,
  audioChunksReceived: 150,
  audioBytesReceived: 48000,
  functionCallsCount: 2,
  ...
}
```

**Good metrics:**
- Duration matches actual call length
- Audio chunks are flowing (not stuck at 0)
- Function calls work (if booking was attempted)

---

## 🔍 Debugging Tips

**If logs stop after a certain point:**
1. Check which step it stopped at
2. Look for error messages right before it stopped
3. Check server terminal for any crashes or exceptions

**If audio isn't working:**
1. Look for `[MediaStream] Received audio...` messages
2. Look for `[RealtimeAgent] Received audio...` messages
3. If neither appear, audio path is broken

**If call hangs:**
1. Check if WebSocket connections are still open
2. Look for timeout errors
3. Check OpenAI API quota/rate limits

---

## 📝 Log Location

**Server logs appear in:**
- The terminal where you ran `npm run dev` in the `server/` directory
- Or wherever your server process is running

**To see ngrok requests:**
- Open http://127.0.0.1:4040 in your browser
- This shows all HTTP requests going through ngrok

---

## ✅ Final Checklist

After the call:
- [ ] Call connected successfully
- [ ] You heard the AI voice
- [ ] AI responded to your speech
- [ ] Call ended normally
- [ ] Logs show successful completion
- [ ] Database has a Call record

**If all checked, you're ready for production! 🚀**
