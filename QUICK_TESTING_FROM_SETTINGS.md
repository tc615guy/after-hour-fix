# Quick Testing Guide - From Settings Page

## ✅ What You Can Test RIGHT NOW (No Server Needed)

### 1. Check AI Assistant Configuration
**Location:** Settings → Assistant Tab

**What to verify:**
- ✅ AI Assistant exists (if not, click "Create AI Assistant")
- ✅ Shows "System Type: OpenAI Realtime" badge
- ✅ Voice: "OpenAI Alloy"
- ✅ Model: "OpenAI GPT-4o Realtime"
- ✅ Base Prompt shows your project details

**What this confirms:**
- Agent was created with `systemType: 'openai-realtime'`
- UI is showing OpenAI Realtime info (not Vapi)
- Database has correct agent record

---

### 2. Test Phone Number Purchase
**Location:** Settings → Numbers Tab

**Steps:**
1. Click "Get Phone Number" or "Purchase Number"
2. Enter area code (e.g., "205") or leave blank for auto-search
3. Click "Purchase"

**What to verify:**
- ✅ Purchase completes successfully
- ✅ Phone number appears in the list
- ✅ Shows "OpenAI Realtime" badge
- ✅ Number is stored in database with `systemType: 'openai-realtime'`

**What this confirms:**
- Phone number purchase flow works
- Number is configured for OpenAI Realtime server
- Database record is correct

**Note:** Even without the server running, you can purchase numbers. They just won't work until the server is running.

---

## 🚀 Full Testing (Requires OpenAI Realtime Server)

To test actual phone calls, you need the server running:

### Start the Server

```bash
cd server
npm install  # First time only
npm run dev  # Starts on port 8080
```

### Environment Variables Needed

Make sure `server/.env` has:
```env
DATABASE_URL=your_database_url
OPENAI_API_KEY=sk-your_key
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
NEXT_PUBLIC_APP_URL=http://localhost:3001
OPENAI_REALTIME_SERVER_URL=http://localhost:8080
```

### For Local Testing (ngrok required)

Since Twilio needs a public URL:

1. **Start ngrok:**
   ```bash
   ngrok http 8080
   ```

2. **Update `OPENAI_REALTIME_SERVER_URL`** in `server/.env` to your ngrok URL:
   ```env
   OPENAI_REALTIME_SERVER_URL=https://your-ngrok-url.ngrok.io
   ```

3. **Update Twilio phone number webhook** (if needed):
   - Go to Twilio Console → Phone Numbers
   - Update webhook URL to: `https://your-ngrok-url.ngrok.io/twilio/voice`

### 📝 Detailed Walkthrough: Update Twilio Phone Number Webhook

**Why this is needed:**
When someone calls your phone number, Twilio needs to know where to send the call data. The webhook URL tells Twilio to send the call to your OpenAI Realtime server.

**Step-by-step instructions:**

1. **Get your ngrok URL:**
   - If ngrok is running, you'll see output like:
     ```
     Forwarding   https://abc123.ngrok.io -> http://localhost:8080
     ```
   - Copy the `https://abc123.ngrok.io` part (your ngrok URL)
   - **Important:** Your webhook URL will be: `https://abc123.ngrok.io/twilio/voice`

2. **Log into Twilio Console:**
   - Go to https://console.twilio.com/
   - Sign in with your Twilio account

3. **Navigate to Phone Numbers:**
   - In the left sidebar, click **"Phone Numbers"**
   - Then click **"Manage"** → **"Active Numbers"**
   - You'll see a list of all your phone numbers

4. **Select your phone number:**
   - Click on the phone number you want to configure
   - This opens the phone number's configuration page

5. **Find the Voice & Fax section:**
   - Scroll down to the **"Voice & Fax"** section
   - Look for **"A CALL COMES IN"** field

6. **Update the webhook URL:**
   - In the **"A CALL COMES IN"** field, enter:
     ```
     https://your-ngrok-url.ngrok.io/twilio/voice
     ```
     (Replace `your-ngrok-url` with your actual ngrok URL)
   
   - Make sure the dropdown next to it says **"HTTP POST"** (it should by default)

7. **Update the Status Callback (optional but recommended):**
   - Find the **"STATUS CALLBACK"** field
   - Enter:
     ```
     https://your-ngrok-url.ngrok.io/twilio/status
     ```
   - This lets your server know when calls end

8. **Save the configuration:**
   - Scroll to the bottom of the page
   - Click the **"Save"** button
   - You should see a green success message

**What to check after saving:**
- ✅ The webhook URL is saved and shows your ngrok URL
- ✅ The method is set to "HTTP POST"
- ✅ No error messages appear

**Visual reference:**
```
Twilio Console
├── Phone Numbers (left sidebar)
│   └── Manage → Active Numbers
│       └── [Click your number]
│           └── Voice & Fax section
│               ├── A CALL COMES IN: [https://abc123.ngrok.io/twilio/voice] [HTTP POST ▼]
│               └── STATUS CALLBACK: [https://abc123.ngrok.io/twilio/status] [HTTP POST ▼]
│               └── [Save button]
```

**Important Notes:**
- ⚠️ **ngrok URL changes** each time you restart ngrok (unless you have a paid plan with a fixed URL)
- If you restart ngrok, you'll get a new URL and need to update this again
- For production, you'll want a permanent domain (not ngrok)

**Troubleshooting:**
- If the webhook URL field is grayed out, make sure you're on the correct phone number
- If you see "Invalid URL", check that your ngrok URL includes `https://` and doesn't have a trailing slash
- If calls don't work after updating, check ngrok is still running and the server is running on port 8080

---

### Test a Call

1. **Call your phone number**
2. **What to check:**
   - ✅ Call connects (doesn't hang up immediately)
   - ✅ You hear AI voice
   - ✅ AI responds to your speech
   - ✅ Conversation flows naturally

---

## 📊 Check Server Health

Once server is running, test health endpoints:

```bash
# Quick check
curl http://localhost:8080/health

# Detailed check
curl http://localhost:8080/health/detailed
```

**Expected:** `{"status":"healthy",...}`

---

## 🐛 Common Issues

### "No phone numbers available"
- Try a different area code
- Check Twilio account has available credits

### "Failed to configure phone number"
- Check `OPENAI_REALTIME_SERVER_URL` is set
- Verify Twilio credentials are correct
- Check server logs for errors

### "Call doesn't connect"
- Server must be running on port 8080
- Need ngrok or public URL for Twilio webhooks
- Check server logs when call comes in

---

## ✅ Success Checklist

- [ ] Agent created with OpenAI Realtime system type
- [ ] Phone number purchased successfully
- [ ] Phone number shows "OpenAI Realtime" badge
- [ ] Server running and health check passes
- [ ] Test call connects and AI responds

---

## Next Steps

Once basic testing works:
1. Test function calling (booking appointments)
2. Test emergency triage
3. Test knowledge base queries
4. Check call analytics in dashboard
5. Review server logs for any errors
