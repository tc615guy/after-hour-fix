# Troubleshooting Guide 🔧

## Common Issues and Solutions

---

## Server Won't Start

### Error: "Cannot find module"

**Solution:**
```bash
cd server
npm install
npx prisma generate
```

### Error: "Port 8080 already in use"

**Solution:**
- Change `PORT` in `.env` file
- Or kill process using port 8080:
  ```bash
  # Windows
  netstat -ano | findstr :8080
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:8080 | xargs kill
  ```

### Error: "Database connection failed"

**Solution:**
1. Check `DATABASE_URL` is correct
2. Verify database is running
3. Check network/firewall settings
4. Test connection: `npx prisma db pull`

---

## Call Issues

### Calls Not Connecting

**Symptoms:** Twilio receives call but no audio/response

**Checklist:**
- [ ] Twilio webhook URL configured correctly
- [ ] `MEDIA_STREAM_URL` uses `wss://` (not `ws://`)
- [ ] Server is accessible from internet (or using ngrok)
- [ ] WebSocket endpoint is accessible
- [ ] Check server logs for errors

**Debug:**
```bash
# Check health
curl http://localhost:8080/health

# Check detailed health
curl http://localhost:8080/health/detailed

# Watch server logs
npm run dev  # Watch for errors
```

---

### Audio Quality Issues

**Symptoms:** Distorted audio, lag, or no audio

**Solutions:**
1. **Check audio converter initialization:**
   - Look for "Audio converter ready" in logs
   - Ensure `speex-resampler` is installed

2. **Check audio buffer sizes:**
   - Review `AudioBufferManager` configuration
   - Adjust buffer sizes if needed

3. **Network latency:**
   - Test server latency: `ping your-server.com`
   - Consider server location (closer to Twilio = better)

---

### Function Calls Not Working

**Symptoms:** AI doesn't book appointments or check availability

**Debug:**
1. Check logs for function call errors:
   ```
   [SessionManager] Function call: get_slots
   [SessionManager] Error executing get_slots...
   ```

2. Verify API endpoints are accessible:
   ```bash
   curl http://localhost:3000/api/calcom/availability?projectId=...
   ```

3. Check `NEXT_PUBLIC_APP_URL` is set correctly

4. Review function call retry logs (should retry 3 times)

---

## Database Issues

### "Call record not created"

**Symptoms:** Calls happen but no database records

**Solutions:**
1. Check database connection in logs
2. Verify Prisma client generated: `npx prisma generate`
3. Check database permissions
4. Review `session-manager.ts` error logs

---

### "EventLog not saving"

**Solutions:**
1. Verify `EventLog` table exists: `npx prisma db pull`
2. Check database connection
3. Review error logs for permission issues

---

## OpenAI API Issues

### "OpenAI API Key not configured"

**Solution:**
```bash
# Set in .env file
OPENAI_API_KEY=sk-...

# Or export
export OPENAI_API_KEY=sk-...
```

---

### "WebSocket connection closed"

**Symptoms:** Calls drop after a few seconds

**Possible Causes:**
1. **Rate limiting:** Check OpenAI API usage
2. **Network issues:** Server internet connection unstable
3. **Reconnection logic:** Should auto-retry (check logs)

**Debug:**
- Check logs for reconnection attempts
- Review `RealtimeAgent` error logs
- Check OpenAI API status

---

## Performance Issues

### High Memory Usage

**Symptoms:** Server crashes or slow performance

**Solutions:**
1. Monitor memory: Check `/health/detailed` endpoint
2. Restart server periodically
3. Increase Node.js memory:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```
4. Review active sessions count
5. Check for memory leaks (unclosed WebSocket connections)

---

### Slow Response Times

**Symptoms:** High latency in calls

**Debug:**
1. Check database latency: `/health/detailed`
2. Review function call logs for slow API endpoints
3. Check server location vs Twilio/OpenAI
4. Review audio buffer settings
5. Monitor concurrent calls (too many = slow)

---

## Twilio Configuration Issues

### "Phone number not found"

**Symptoms:** Calls get "not configured" message

**Solutions:**
1. Verify phone number exists in database:
   ```sql
   SELECT * FROM "PhoneNumber" WHERE "e164" = '+1234567890';
   ```

2. Check phone number format (must be E.164: `+1234567890`)

3. Verify project has an agent:
   ```sql
   SELECT * FROM "Agent" WHERE "projectId" = '...' AND "deletedAt" IS NULL;
   ```

---

### "Webhook URL not working"

**Solutions:**
1. Use ngrok for local testing:
   ```bash
   ngrok http 8080
   # Use ngrok URL in Twilio
   ```

2. Verify HTTPS/WSS for production

3. Check Twilio webhook logs in Twilio Console

4. Test webhook manually:
   ```bash
   curl -X POST https://your-domain.com/twilio/voice \
     -d "CallSid=test&From=+1234567890&To=+1987654321"
   ```

---

## Logs and Debugging

### Enable Verbose Logging

Set in `.env`:
```bash
NODE_ENV=development
```

Or in code, check for:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log(...) // More detailed logs
}
```

---

### Common Log Messages

**Good:**
- `[SessionManager] Creating session for call...`
- `[SessionManager] Audio converter ready`
- `[RealtimeAgent] WebSocket connected`
- `[SessionManager] Function call: get_slots`

**Warnings (usually OK):**
- `[SessionManager] Audio converter not ready` (temporary during init)
- `[RealtimeAgent] Already connecting/connected` (expected)

**Errors (need attention):**
- `[SessionManager] Failed to create Call record`
- `[RealtimeAgent] WebSocket error`
- `[SessionManager] Error executing function...`
- `[Alert ERROR]` - Check alert details

---

## Getting Help

1. **Check logs** - Most issues show in server logs
2. **Review health check** - `/health/detailed` shows service status
3. **Check alerts** - Review `EventLog` table for errors
4. **Test endpoints** - Verify API endpoints work independently
5. **Review documentation** - Check `API.md` and `DEPLOYMENT.md`

---

**Need more help?** Check the main project documentation or create an issue!
