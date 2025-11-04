# OpenAI Realtime Agent Testing Guide 🧪

This guide will walk you through testing the OpenAI Realtime agent from start to finish.

## Prerequisites Checklist

Before you begin testing, make sure you have:

- [ ] **Database migration applied:**
  ```bash
  npx prisma migrate dev --name add_system_type
  npx prisma generate
  ```

- [ ] **OpenAI Realtime server running:**
  ```bash
  cd server
  npm install
  npm run dev
  ```
  Server should start on port 8080 (or PORT env var)

- [ ] **Environment variables set:**
  - `OPENAI_API_KEY` - Your OpenAI API key
  - `DATABASE_URL` - PostgreSQL connection string
  - `TWILIO_ACCOUNT_SID` - Twilio account SID
  - `TWILIO_AUTH_TOKEN` - Twilio auth token
  - `NEXT_PUBLIC_APP_URL` - Your app URL (e.g., `http://localhost:3000`)
  - `OPENAI_REALTIME_SERVER_URL` - OpenAI Realtime server URL (e.g., `http://localhost:8080`)

- [ ] **Next.js app running:**
  ```bash
  npm run dev
  ```
  App should be on `http://localhost:3000`

- [ ] **Twilio phone number configured:**
  - Phone number purchased in Twilio
  - Phone number exists in your database (`PhoneNumber` table)
  - Phone number has correct `systemType` set

---

## Step 1: Verify Server Status

### Check Health Endpoints

```bash
# Quick health check
curl http://localhost:8080/health

# Detailed health check
curl http://localhost:8080/health/detailed
```

**Expected Response:**
```json
{
  "status": "healthy",
  "uptime": 123.45,
  "activeSessions": 0,
  "database": "connected",
  "openai": "configured",
  "twilio": "configured"
}
```

### Check Server Logs

Watch the server console for:
- ✅ "Server running on port 8080"
- ✅ "WebSocket server initialized"
- ✅ "Health check endpoint ready"
- ❌ No error messages

---

## Step 2: Set Up Test Agent

### Option A: Use Existing Agent (Recommended)

1. **Go to your dashboard:**
   ```
   http://localhost:3000/dashboard
   ```

2. **Select a project** (or create a test project)

3. **Go to Settings → Assistant tab:**
   ```
   http://localhost:3000/projects/[PROJECT_ID]/settings?tab=assistant
   ```

4. **Find the "AI System Type" card**

5. **Toggle to "OpenAI Realtime"**
   - Click the toggle switch
   - Confirm the dialog
   - Wait for success message

6. **Verify the switch:**
   - Badge should show "🤖 OpenAI Realtime"
   - Status should be "Active"

### Option B: Migrate via Script

```bash
# Check current status
tsx scripts/check-migration-status.ts

# Migrate specific agent (dry-run first)
tsx scripts/migrate-to-openai-realtime.ts --agent-id [AGENT_ID] --dry-run

# Actually migrate
tsx scripts/migrate-to-openai-realtime.ts --agent-id [AGENT_ID]
```

---

## Step 3: Configure Phone Number

### Verify Phone Number Setup

1. **Check phone number in database:**
   ```bash
   # Using Prisma Studio (recommended)
   npx prisma studio
   
   # Or check via script
   tsx scripts/check-migration-status.ts --project-id [PROJECT_ID]
   ```

2. **Verify Twilio configuration:**
   - Phone number should point to: `http://localhost:8080/twilio/voice`
   - Status callback: `http://localhost:8080/twilio/status`

3. **For local testing, you'll need:**
   - **ngrok** (or similar) to expose your local server:
     ```bash
     ngrok http 8080
     ```
   - Update `OPENAI_REALTIME_SERVER_URL` to your ngrok URL
   - Update Twilio phone number webhook to ngrok URL

---

## Step 4: Make Test Calls

### Test Call #1: Basic Connection

**What to test:** Call connects and audio flows both ways

**Steps:**
1. Call your test phone number
2. Wait for connection (should hear "Connecting you now")
3. Speak: "Hello, can you hear me?"
4. Listen for AI response

**What to check:**
- ✅ Call connects (no immediate hangup)
- ✅ You can hear the AI
- ✅ AI can hear you
- ✅ Conversation flows naturally
- ✅ No audio glitches or delays

**Server logs to watch:**
```
[Twilio] Incoming call: CAxxxxx from +1xxx to +1xxx
[Session] Created session for call CAxxxxx
[OpenAI] Connected to Realtime API
[OpenAI] Session created: sess_xxxxx
[Audio] Received audio chunk: 160 bytes
[Audio] Sent audio chunk: 320 bytes
```

### Test Call #2: Function Calling

**What to test:** AI can call functions (get_slots, book_slot, etc.)

**Steps:**
1. Call the number
2. Say: "I need to book an appointment"
3. Follow the AI's prompts
4. Complete a booking

**What to check:**
- ✅ AI recognizes booking intent
- ✅ `get_slots` function is called
- ✅ Available slots are retrieved
- ✅ `book_slot` function is called
- ✅ Booking is created successfully
- ✅ AI confirms the booking

**Server logs to watch:**
```
[Function Call] get_slots called with: { date: "2024-01-15", isEmergency: false }
[Function Call] get_slots result: { slots: [...] }
[Function Call] book_slot called with: { customerName: "...", ... }
[Function Call] book_slot result: { success: true, bookingId: "..." }
```

### Test Call #3: Emergency Triage

**What to test:** Emergency detection and routing

**Steps:**
1. Call the number
2. Say: "My pipe burst and water is everywhere!"
3. Test emergency routing

**What to check:**
- ✅ AI detects emergency keywords
- ✅ AI asks clarifying questions
- ✅ Emergency slots are fetched (different date range)
- ✅ On-call routing is attempted (if configured)
- ✅ Appropriate urgency handling

**Server logs to watch:**
```
[Emergency] Emergency detected: burst pipe, water
[Function Call] get_slots called with: { isEmergency: true, date: "2024-01-15" }
[Emergency] Checking on-call availability...
```

### Test Call #4: Knowledge Base Queries

**What to test:** AI can query knowledge base

**Steps:**
1. Call the number
2. Ask: "What's your service area?"
3. Ask: "What's your warranty policy?"

**What to check:**
- ✅ `get_knowledge` function is called
- ✅ Knowledge base is queried
- ✅ Relevant information is returned
- ✅ AI provides accurate answers

### Test Call #5: Service Area Check

**What to test:** Service area validation

**Steps:**
1. Call the number
2. Say: "I'm located at [address outside service area]"
3. Verify service area check

**What to check:**
- ✅ `check_service_area` function is called
- ✅ Address is geocoded
- ✅ Service area is checked
- ✅ Appropriate message if outside area

### Test Call #6: Call Completion & Transcript

**What to test:** Call ends properly and transcript is saved

**Steps:**
1. Make a normal call
2. Have a conversation
3. End the call (hang up)

**What to check:**
- ✅ Call ends gracefully
- ✅ Session is closed
- ✅ Transcript is generated
- ✅ Call record is created in database
- ✅ Duration is recorded
- ✅ Intent is captured

**Database check:**
```sql
SELECT * FROM "Call" WHERE "vapiCallId" = '[CALL_SID]' ORDER BY "createdAt" DESC LIMIT 1;
```

---

## Step 5: Monitor Performance

### Check Server Metrics

```bash
# Health endpoint shows metrics
curl http://localhost:8080/health/detailed
```

**Metrics to monitor:**
- Active sessions
- Uptime
- Database connection status
- OpenAI API status
- Average latency

### Check Analytics

```bash
# Project analytics
curl http://localhost:8080/analytics/project/[PROJECT_ID]

# Recent calls
curl http://localhost:8080/analytics/project/[PROJECT_ID]/recent
```

### Check Event Logs

```bash
# Using Prisma Studio
npx prisma studio

# Navigate to EventLog table
# Look for:
# - migration.to_openai_realtime
# - session.created
# - session.ended
# - function_call.*
```

---

## Step 6: Test Error Scenarios

### Error Test #1: OpenAI API Down

**What to test:** Graceful handling of OpenAI API failures

**Steps:**
1. Temporarily use invalid `OPENAI_API_KEY`
2. Make a call
3. Observe error handling

**What to check:**
- ✅ Error is logged
- ✅ User gets appropriate message
- ✅ Call doesn't crash
- ✅ Alert is sent (if configured)

### Error Test #2: Database Connection Lost

**What to test:** Database reconnection

**Steps:**
1. Stop database connection
2. Make a call
3. Restart database
4. Verify recovery

**What to check:**
- ✅ Errors are logged
- ✅ Retry logic works
- ✅ System recovers when DB is back

### Error Test #3: Function Call Failure

**What to test:** Function call error handling

**Steps:**
1. Temporarily break an API endpoint (e.g., `/api/book`)
2. Make a call and try to book
3. Observe error handling

**What to check:**
- ✅ Error is caught and logged
- ✅ Retry logic works
- ✅ User gets friendly error message
- ✅ Alert is sent

---

## Step 7: Compare with Vapi

### Side-by-Side Comparison

**Test both systems:**
1. Make call on Vapi agent (systemType = 'vapi')
2. Make call on OpenAI Realtime agent (systemType = 'openai-realtime')
3. Compare:
   - Response latency
   - Audio quality
   - Function calling speed
   - Overall conversation quality

**Metrics to compare:**
- Call duration
- Function call count
- Function call latency
- Audio quality (subjective)
- Cost per minute (calculate from logs)

---

## Testing Checklist

### ✅ Basic Functionality
- [ ] Call connects successfully
- [ ] Audio flows both directions
- [ ] AI responds appropriately
- [ ] Conversation flows naturally

### ✅ Function Calling
- [ ] `get_slots` works
- [ ] `book_slot` works
- [ ] `get_pricing` works
- [ ] `get_knowledge` works
- [ ] `check_service_area` works

### ✅ Emergency Handling
- [ ] Emergency detection works
- [ ] Emergency routing works
- [ ] Emergency slots are different

### ✅ Call Management
- [ ] Call records are created
- [ ] Transcripts are saved
- [ ] Duration is recorded
- [ ] Intent is captured
- [ ] Status updates work

### ✅ Error Handling
- [ ] API errors are handled gracefully
- [ ] Database errors are handled
- [ ] Function call failures are retried
- [ ] Alerts are sent (if configured)

### ✅ Performance
- [ ] Latency is acceptable (< 500ms)
- [ ] No audio glitches
- [ ] No connection drops
- [ ] Memory usage is stable

### ✅ Integration
- [ ] Dashboard shows OpenAI Realtime calls
- [ ] Analytics work
- [ ] System type badge shows correctly
- [ ] Migration scripts work

---

## Troubleshooting

### Call Doesn't Connect

**Check:**
1. Server is running: `curl http://localhost:8080/health`
2. Twilio webhook URL is correct
3. Phone number `systemType` is 'openai-realtime'
4. Agent `systemType` is 'openai-realtime'
5. Server logs for errors

**Fix:**
```bash
# Check server logs
# Verify Twilio configuration
# Verify database records
```

### Audio Issues

**Check:**
1. Audio converter is working
2. WebSocket connection is stable
3. OpenAI Realtime API is responding
4. Audio format conversion (8kHz ↔ 24kHz)

**Fix:**
```bash
# Check audio logs in server console
# Verify AudioConverter is initialized
# Check OpenAI connection status
```

### Function Calls Not Working

**Check:**
1. API endpoints are accessible
2. Function definitions are correct
3. Parameters are being passed correctly
4. API responses are formatted correctly

**Fix:**
```bash
# Test API endpoints directly
curl http://localhost:3000/api/book -X POST -d '{...}'

# Check server logs for function call errors
# Verify function call handlers in session-manager.ts
```

### Database Issues

**Check:**
1. Database connection is working
2. Migrations are applied
3. Call records are being created
4. EventLog entries are being written

**Fix:**
```bash
# Check database connection
npx prisma studio

# Verify migrations
npx prisma migrate status

# Check EventLog table
```

---

## Next Steps After Testing

Once testing is successful:

1. **Deploy to staging:**
   - Deploy OpenAI Realtime server to staging environment
   - Configure production Twilio numbers
   - Test with real phone numbers

2. **Monitor production:**
   - Set up alerts
   - Monitor metrics
   - Track error rates

3. **Gradual migration:**
   - Migrate 1-2 test agents first
   - Monitor for 24-48 hours
   - Gradually increase migration percentage
   - Full migration when confident

4. **Optimize:**
   - Tune audio buffer sizes
   - Optimize function call latency
   - Fine-tune prompts
   - Adjust emergency detection thresholds

---

## Quick Reference

### Useful Commands

```bash
# Check migration status
tsx scripts/check-migration-status.ts

# Migrate agent
tsx scripts/migrate-to-openai-realtime.ts --agent-id [ID]

# Rollback agent
tsx scripts/rollback-to-vapi.ts --agent-id [ID]

# Check server health
curl http://localhost:8080/health/detailed

# View analytics
curl http://localhost:8080/analytics/project/[PROJECT_ID]

# Check database
npx prisma studio
```

### Important URLs

- **Server health:** `http://localhost:8080/health`
- **Server detailed:** `http://localhost:8080/health/detailed`
- **Project analytics:** `http://localhost:8080/analytics/project/[PROJECT_ID]`
- **Dashboard:** `http://localhost:3000/dashboard`
- **Settings:** `http://localhost:3000/projects/[PROJECT_ID]/settings?tab=assistant`

### Important Files

- **Server entry:** `server/src/index.ts`
- **Session manager:** `server/src/session-manager.ts`
- **Realtime agent:** `server/src/realtime-agent.ts`
- **Twilio routes:** `server/src/twilio/routes.ts`
- **Function handlers:** `server/src/session-manager.ts` (function call handlers)

---

## Support

If you encounter issues:

1. Check server logs for errors
2. Check database EventLog for issues
3. Review this guide's troubleshooting section
4. Check API documentation in `server/API.md`
5. Review troubleshooting guide in `server/TROUBLESHOOTING.md`

Happy testing! 🚀
