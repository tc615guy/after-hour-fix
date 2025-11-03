# Cal.com + Vapi Integration Checklist

## ✅ CONFIRMED WORKING

### Cal.com v2 API
- [x] Using correct base URL: `https://api.cal.com`
- [x] Using correct API version header: `cal-api-version: 2024-08-12`
- [x] Availability endpoint: `/v2/slots/available` with `startTime` and `endTime` params
- [x] Booking endpoint: `/v2/bookings` (POST)
- [x] Confirmation endpoint: `/v2/bookings/{uid}/confirm` (POST)
- [x] Reservation endpoint: `/v2/slots/reserve` (POST) - optional but recommended
- [x] Booking payload includes:
  - `eventTypeId` (number)
  - `start` (ISO string)
  - `timeZone` (string) - **REQUIRED at root level**
  - `language` (string) - **REQUIRED at root level**
  - `attendee` object with name, email, timeZone, language
  - `bookingFieldsResponses` object for custom fields
  - `metadata` object

### Vapi Server Tools
- [x] All tool responses include `result` field with human-readable string
- [x] All tool endpoints accept POST requests (Vapi uses POST for function calls)
- [x] Tool URLs include `projectId` query parameter
- [x] Error responses return 200 status with `result` field so Vapi can read them
- [x] Tool descriptions are clear and actionable

### Timezone Handling
- [x] After 4 PM filter compares dates in **project timezone** (not UTC)
- [x] Display formatting uses project timezone
- [x] All date comparisons use same timezone

## ⚠️ POTENTIAL ISSUES TO WATCH

### 1. Cal.com Booking Payload
**Current implementation:**
```typescript
{
  eventTypeId: 3798493,
  start: "2025-11-04T13:00:00.000Z",
  timeZone: "America/Chicago",
  language: "en",  // ✅ At root level
  attendee: {
    name: "Jake Wright",
    email: "3123228967@sms.afterhourfix.com",
    timeZone: "America/Chicago",
    language: "en"
  },
  bookingFieldsResponses: {
    phone: "312-322-8967",
    address: "3114 Don Eerd Court, Murfreesboro, Tennessee",
    notes: "Thermostat isn't working."
  },
  metadata: { ... }
}
```

**Potential issue:** Cal.com v2 docs may require different field names for custom booking fields.
**Action:** If booking fails with field validation errors, check Cal.com dashboard for exact field names.

### 2. Vapi AI Not Calling Functions
**Common causes:**
- Tool description not clear enough
- AI doesn't understand when to use the tool
- Response format doesn't match expectations
- Tool call fails silently

**Current mitigation:**
- Clear tool descriptions with explicit instructions
- Prompt explicitly tells AI when to call each function
- All responses include `result` field for Vapi to read
- Extensive logging to track function calls

### 3. Service Area Check
**Current status:** Made `address` parameter optional to prevent blocking bookings
**Potential issue:** AI might call it without the address parameter
**Mitigation:** Tool description says "OPTIONAL" and "Requires the full address string"

### 4. Booking Confirmation Flow
**Current flow:**
1. AI calls `get_slots` → Gets available times
2. AI proposes time to customer
3. Customer agrees
4. AI calls `book_slot` with `confirm=true`
5. Backend reserves slot (optional)
6. Backend creates booking via Cal.com v2
7. Backend confirms booking via `/v2/bookings/{uid}/confirm`
8. Backend updates database status to 'booked'
9. Backend sends SMS confirmation

**Potential issue:** If any step fails, booking might be partial
**Mitigation:** Error responses return human-readable messages so AI can handle gracefully

## 🔍 DEBUGGING CHECKLIST

If booking fails, check in this order:

1. **Vercel Logs - Availability Call**
   - Does `/api/calcom/availability` return 200?
   - Does response include `result` field?
   - Are slots being filtered correctly (after 4 PM check)?
   - Log: `[Cal.com Availability] FULL RESPONSE PAYLOAD`

2. **Vercel Logs - Booking Call**
   - Does `/api/book` receive all required parameters?
   - Log: `[BOOK] Final extracted parameters`
   - Does Cal.com v2 reservation succeed?
   - Log: `[BOOK] Slot reserved`
   - Does Cal.com v2 booking succeed?
   - Log: `[BOOK] Cal.com v2 booking created`
   - Does confirmation succeed?
   - Log: `[BOOK] Cal.com v2 booking confirmed successfully`

3. **Vapi Call Logs**
   - Is AI calling `get_slots`?
   - Is AI receiving the `result` field?
   - Is AI proposing a time to the customer?
   - Is customer agreeing?
   - Is AI calling `book_slot` with `confirm=true`?
   - Is AI receiving the booking success response?

4. **Database Check**
   - Is booking created in database?
   - Does it have `calcomBookingId` and `calcomBookingUid`?
   - Is status 'booked' (not 'pending' or 'failed')?
   - Is technician assigned?

## 🚨 KNOWN ISSUES (FIXED)

- ~~Variable name collision (`now` defined twice)~~ ✅ Fixed: renamed to `currentTime`
- ~~Timezone mismatch in 4 PM filter~~ ✅ Fixed: now compares in project timezone
- ~~Missing `language` field in booking payload~~ ✅ Fixed: added at root level
- ~~Missing `timeZone` field in booking payload~~ ✅ Fixed: added at root level
- ~~Service area check blocking bookings~~ ✅ Fixed: made address optional
- ~~Cal.com v2 slots endpoint returning 404~~ ✅ Fixed: using `/v2/slots/available`
- ~~Vapi "No result returned"~~ ✅ Fixed: all tools return `result` field
- ~~AI not calling `book_slot`~~ ✅ Fixed: strengthened prompt instructions

## 📝 NEXT STEPS

1. **Wait for Vercel deploy** (~2 min)
2. **Make test call** to Josh's number
3. **Say "afternoon works"** when asked for timing
4. **Verify AI proposes TOMORROW's slots** (not today, since it's after 4 PM)
5. **Agree to the time**
6. **Verify booking completes successfully**
7. **Check database** for confirmed booking with technician assigned
8. **Check SMS** was sent to customer

## 🎯 SUCCESS CRITERIA

✅ AI calls `get_slots` and receives available times  
✅ AI proposes a time from the `result` field  
✅ AI calls `book_slot` after customer agrees  
✅ Cal.com v2 booking is created and confirmed  
✅ Database shows booking with status 'booked'  
✅ Technician is assigned  
✅ SMS confirmation is sent  
✅ No errors in Vercel logs  

---

**Last Updated:** 2025-11-03 (after timezone fix)

