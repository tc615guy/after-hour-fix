# Day 10: Testing & Refinement 🧪

## Status: Ready for Testing!

We've completed Days 8-9 ahead of schedule:
- ✅ Day 8: Call transcription storage
- ✅ Day 9: SMS missed-call auto-response
- 🎯 **Day 10: Testing & Refinement**

## Testing Checklist

### 1. End-to-End Call Flow Test

#### Test Scenario 1: Successful Booking Call
- [ ] Make test call to Twilio number
- [ ] Verify AI answers and greets
- [ ] Verify emergency/routine triage works
- [ ] Verify AI asks for customer info (one question at a time)
- [ ] Verify `get_slots` function call works
- [ ] Verify AI proposes time from get_slots result
- [ ] Verify customer can agree to time
- [ ] Verify `book_slot` function call works
- [ ] Verify booking created in database
- [ ] Verify Cal.com booking created
- [ ] Verify transcript stored in Call record
- [ ] Verify call duration recorded

#### Test Scenario 2: Emergency Call
- [ ] Make call describing urgent issue (e.g., "burst pipe")
- [ ] Verify AI detects emergency
- [ ] Verify `get_slots` called with `isEmergency=true`
- [ ] Verify same-day slots offered
- [ ] Verify booking created with emergency flag

#### Test Scenario 3: Pricing Inquiry
- [ ] Make call asking about pricing
- [ ] Verify `get_pricing` function call works
- [ ] Verify AI reads pricing correctly
- [ ] Verify call completes without booking

#### Test Scenario 4: Knowledge Base Query
- [ ] Make call asking about warranty/service area
- [ ] Verify `get_knowledge` function call works
- [ ] Verify AI responds with knowledge base info

#### Test Scenario 5: Missed Call SMS
- [ ] Make call but let it go to voicemail/no-answer
- [ ] Verify Call record created with `status='missed'`
- [ ] Verify SMS sent to caller
- [ ] Verify SMS includes booking URL
- [ ] Verify EventLog entry created

### 2. Audio Quality Test

- [ ] Verify audio is clear (no distortion)
- [ ] Verify no lag/delay issues
- [ ] Verify bidirectional audio works smoothly
- [ ] Verify audio conversion (8kHz ↔ 24kHz) works correctly
- [ ] Test with various phone types (landline, mobile, VoIP)

### 3. Error Handling Test

#### Test Scenario 6: Network Interruption
- [ ] Start a call
- [ ] Temporarily disconnect server internet
- [ ] Verify reconnection logic works
- [ ] Verify call doesn't drop
- [ ] Verify session recovers gracefully

#### Test Scenario 7: OpenAI API Error
- [ ] Make call
- [ ] Simulate OpenAI API error (wrong API key, rate limit)
- [ ] Verify error is logged
- [ ] Verify graceful error message to caller (if possible)

#### Test Scenario 8: Missing Configuration
- [ ] Test with missing `OPENAI_API_KEY`
- [ ] Test with missing `DATABASE_URL`
- [ ] Test with missing Twilio credentials
- [ ] Verify clear error messages

#### Test Scenario 9: Invalid Function Call
- [ ] Make call that triggers function call
- [ ] Simulate API endpoint failure (e.g., Cal.com down)
- [ ] Verify error is handled gracefully
- [ ] Verify AI explains issue to caller

### 4. Database Integration Test

- [ ] Verify Call records created correctly
- [ ] Verify Booking records created correctly
- [ ] Verify transcript stored correctly
- [ ] Verify duration calculated correctly
- [ ] Verify phone numbers stored correctly
- [ ] Verify EventLog entries created
- [ ] Query database to verify data integrity

### 5. Performance Test

- [ ] Measure call setup time (call start → AI responding)
- [ ] Measure function call latency (function call → result)
- [ ] Measure audio latency (speech → response)
- [ ] Test with concurrent calls (2-3 simultaneous)
- [ ] Monitor memory usage during calls
- [ ] Monitor CPU usage during calls
- [ ] Check WebSocket connection stability

### 6. Integration Test

#### Test Scenario 10: Cal.com Integration
- [ ] Verify slots fetched from Cal.com correctly
- [ ] Verify booking created in Cal.com
- [ ] Verify booking appears in Cal.com calendar
- [ ] Test with different timezones
- [ ] Test with business hours filtering

#### Test Scenario 11: Database Queries
- [ ] Verify phone number lookup works
- [ ] Verify agent/project lookup works
- [ ] Verify existing bookings prevent conflicts

### 7. Code Quality & Logging

- [ ] Review console logs for clarity
- [ ] Verify all errors are logged
- [ ] Verify metrics are logged correctly
- [ ] Check for any console warnings
- [ ] Verify no duplicate logging
- [ ] Review error messages for helpfulness

## Bug Fixes & Refinements

### High Priority Fixes
- [ ] Fix any critical bugs found in testing
- [ ] Fix TypeScript linter errors (`npx prisma generate`)
- [ ] Fix any runtime errors
- [ ] Improve error messages
- [ ] Add missing error handling

### Medium Priority Improvements
- [ ] Optimize audio buffer sizes if latency is high
- [ ] Add retry logic for failed function calls
- [ ] Improve session cleanup
- [ ] Add connection health checks
- [ ] Improve logging verbosity

### Low Priority Polish
- [ ] Clean up console.log statements
- [ ] Add JSDoc comments
- [ ] Improve variable naming
- [ ] Refactor duplicate code

## Testing Commands

### 1. Start Server
```bash
cd server
npm run dev
```

### 2. Check Health
```bash
curl http://localhost:8080/health
```

### 3. Monitor Logs
```bash
# Watch for errors, function calls, audio events
tail -f server.log  # if logging to file
```

### 4. Test Database
```sql
-- Check recent calls
SELECT id, "vapiCallId", status, "durationSec", 
       LEFT(transcript, 50) as transcript_preview,
       "createdAt"
FROM "Call"
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check recent bookings
SELECT id, "customerName", "customerPhone", "slotStart", status
FROM "Booking"
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check EventLog
SELECT type, "createdAt", payload
FROM "EventLog"
ORDER BY "createdAt" DESC
LIMIT 10;
```

### 5. Test Twilio Webhook (Local)
```bash
# Use ngrok or similar to expose local server
ngrok http 8080

# Update Twilio webhook URL to: https://your-ngrok-url.ngrok.io/twilio/voice
```

## Expected Test Results

### ✅ Success Criteria
- All test scenarios pass
- No critical bugs
- Audio quality is acceptable
- Function calls work reliably
- Database integration works
- Error handling is robust
- Performance is acceptable (<200ms latency)

### ⚠️ Known Issues to Address
- TypeScript linter errors (fix with `npx prisma generate`)
- Any discovered bugs from testing

## After Testing

Once testing is complete:

1. **Document any bugs found** → Create issues/todos
2. **Fix critical bugs** → Prioritize by impact
3. **Update documentation** → Add troubleshooting guide
4. **Prepare for deployment** → Ensure all env vars documented

## Next Steps (Week 3)

After Day 10 testing:
- Week 3 focuses on production features
- Phone number management UI
- Monitoring & alerts
- Load testing
- Documentation

---

**Day 10 Goal**: Ensure system is stable, reliable, and ready for production testing! 🎯
