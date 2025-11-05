# Emergency Dispatch System

## Overview

The emergency dispatch system automatically notifies technicians via **SMS and phone call** when an emergency booking is created. Technicians must acknowledge receipt by replying with "1" (or similar acknowledgment), and the system tracks responses and escalates if no response is received.

## Features

✅ **Dual Notification**: SMS + Phone Call  
✅ **Required Acknowledgment**: Tech must reply "1" to confirm  
✅ **Automatic Status Update**: Booking status changes to "en_route" when acknowledged  
✅ **Proximity-Based Routing**: Routes to closest tech based on home address distance (for companies with multiple on-call techs)  
✅ **Smart Priority**: Combines priority + proximity for optimal routing  
✅ **Timeout & Escalation**: If no response within 5 minutes, escalates to backup tech (also uses proximity)  
✅ **Full Tracking**: All events logged in EventLog for audit trail  

## How It Works

### 1. Emergency Dispatch Initiated

When `dispatch_emergency` function is called (via AI assistant):

1. **Finds all on-call technicians** and scores them by:
   - **Priority** (higher priority = higher score)
   - **Proximity** (distance from tech's home address to emergency location)
   - **Combined score** = Priority × 10 + Proximity bonus (0-30 points)
   
2. **Selects best tech** based on combined score (closest tech with good priority wins)

3. **Creates/updates emergency booking** (assigns technician)

4. **Sends SMS** with full details:
   ```
   🚨 EMERGENCY DISPATCH - [Business Name]
   
   Customer: [Name]
   Phone: [Phone]
   Address: [Address]
   Issue: [Description]
   Appointment: [Time]
   
   Please call the customer and head over. Reply 1 if en route.
   ```
4. **Makes phone call** with TwiML message (same info, spoken)
5. **Logs dispatch event** in EventLog

### 2. Technician Response

Technician receives both SMS and phone call. They reply via SMS:

- **Acknowledgment patterns**: `1`, `yes`, `y`, `ok`, `okay`, `ack`, `acknowledged`, `on my way`, `en route`, `heading there`, `got it`, `received`
- **Response handling**: SMS webhook (`/api/twilio/sms-webhook`) processes the reply
- **Status update**: Booking status changes from `pending` → `en_route`
- **Confirmation SMS**: Tech receives confirmation: "✅ Acknowledged! Status updated to en route."

### 3. Timeout & Escalation

If technician doesn't respond within **5 minutes**:

1. **Find all available backup techs** (exclude original tech)
2. **Score backup techs** by priority + proximity (same scoring as initial dispatch)
3. **Select best backup** based on combined score
4. **Escalate**: Reassigns booking to backup tech
5. **Notify backup**: Sends SMS + phone call to backup tech
6. **Log escalation**: Records in EventLog

If no backup available, logs event for manual review.

**Note**: Escalation now considers proximity, not just priority, so the closest backup tech will be selected.

## API Endpoints

### `/api/emergency/dispatch` (POST)
Dispatches emergency to technician.

**Request:**
```json
{
  "projectId": "string",
  "customerName": "string",
  "customerPhone": "string",
  "address": "string",
  "notes": "string (optional)",
  "callId": "string (optional)",
  "bookingId": "string (optional)",
  "slotStart": "string (ISO date, optional)"
}
```

**Response:**
```json
{
  "dispatched": true,
  "technician": {
    "id": "string",
    "name": "string",
    "phone": "string"
  },
  "bookingId": "string",
  "result": "You're booked. I've dispatched [Tech Name]..."
}
```

### `/api/emergency/notify-call` (GET)
TwiML endpoint for phone call notification. Called by Twilio.

**Query params:**
- `bookingId`: Booking ID
- `technicianId`: Technician ID

**Returns:** TwiML XML with spoken emergency message

### `/api/twilio/sms-webhook` (POST)
Handles incoming SMS from technicians. Processes acknowledgments.

**Expected:** Twilio webhook format (FormData)

**Response:** TwiML Message response

### `/api/emergency/call-status` (POST)
Tracks phone call status (answered, completed, etc.).

**Expected:** Twilio status callback webhook

### `/api/emergency/check-timeout` (POST)
Checks for unacknowledged dispatches and escalates if needed.

**Request:**
```json
{
  "projectId": "string (optional)",
  "timeoutMinutes": 5
}
```

**Response:**
```json
{
  "success": true,
  "checked": 2,
  "results": [
    {
      "bookingId": "string",
      "action": "escalated",
      "fromTech": "string",
      "toTech": "string"
    }
  ]
}
```

## Configuration

### Twilio Setup

✅ **SMS Webhook is automatically configured** when phone numbers are purchased or connected via the API.

**For existing phone numbers** (if you had numbers before this feature):
1. **SMS Webhook URL**: Configure in Twilio Console
   - Go to: Phone Numbers → Manage → Active Numbers → [Your Number]
   - Set "A MESSAGE COMES IN" webhook URL to:
     ```
     https://yourdomain.com/api/twilio/sms-webhook
     ```
   - Method: `POST`

**Phone Number Configuration**:
- Ensure `TWILIO_PHONE_NUMBER` is set in `.env` (used for outbound SMS/calls)
- New numbers purchased via `/api/numbers` automatically have SMS webhook configured

3. **Environment Variables**:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

### Scheduled Timeout Check

Set up a cron job or scheduled task to call `/api/emergency/check-timeout` every 1-2 minutes:

```bash
# Example cron job (runs every 2 minutes)
*/2 * * * * curl -X POST https://yourdomain.com/api/emergency/check-timeout
```

Or use Vercel Cron (in `vercel.json`):
```json
{
  "crons": [{
    "path": "/api/emergency/check-timeout",
    "schedule": "*/2 * * * *"
  }]
}
```

## Database Schema

### Booking Status Flow

```
pending → en_route → completed
   ↓
canceled (if tech doesn't respond and no backup)
```

### EventLog Types

- `emergency.dispatched`: Initial dispatch sent
- `emergency.acknowledged`: Tech replied with acknowledgment
- `emergency.call_status`: Phone call status update
- `emergency.escalated`: Escalated to backup tech
- `emergency.timeout_no_backup`: No backup available for escalation

## Testing

### Manual Test

1. **Create emergency booking** via AI assistant or API
2. **Check SMS**: Tech should receive SMS immediately
3. **Check phone call**: Tech should receive call within seconds
4. **Reply with "1"**: Send SMS from tech's phone
5. **Verify status**: Booking status should update to `en_route`
6. **Check logs**: EventLog should show `emergency.acknowledged`

### Test Timeout

1. **Dispatch emergency** but don't reply
2. **Wait 5+ minutes**
3. **Call `/api/emergency/check-timeout`** manually
4. **Verify escalation**: Should reassign to backup tech (if available)

## Troubleshooting

### SMS Not Received
- Check Twilio webhook is configured correctly
- Verify `TWILIO_PHONE_NUMBER` in `.env`
- Check Twilio console for message logs

### Phone Call Not Working
- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check TwiML endpoint is accessible: `/api/emergency/notify-call`
- Review Twilio call logs in console

### Acknowledgment Not Working
- Verify SMS webhook URL is set in Twilio
- Check phone number format matches (normalization handles variations)
- Review webhook logs for errors

### No Escalation
- Ensure backup technicians have `isOnCall: true`
- Check timeout check is running (cron/scheduled task)
- Verify `/api/emergency/check-timeout` endpoint is accessible

## Future Enhancements

- [ ] Add manager notification when no backup available
- [ ] Support for multiple acknowledgment attempts
- [ ] Real-time dashboard showing dispatch status
- [ ] Integration with technician mobile app
- [ ] GPS tracking for "en route" verification
- [ ] Automatic timeout check via background job queue

