# How the AI Assistant Sees Technicians and Bookings

## Overview
The AI assistant **does NOT directly access the database**. Instead, it calls **functions** that query the database and return formatted results.

---

## Flow: How AI Checks Availability

### Step 1: AI Calls `get_slots()` Function
```
Customer: "When can you come out?"
AI: "Let me check what's available..." 
    → Calls get_slots(isEmergency=false, start=tomorrow)
```

### Step 2: `get_slots` → Availability Endpoint
The function calls: `/api/calcom/availability?projectId=xxx&start=tomorrow&end=+7days`

### Step 3: Backend Calculates Available Slots

**What the backend does:**

1. **Fetches All Active Technicians:**
   ```typescript
   technicians = [
     { id: "tech1", name: "John Smith", bookings: [...] },
     { id: "tech2", name: "Jane Doe", bookings: [...] },
     { id: "tech3", name: "Bob Johnson", bookings: [...] }
   ]
   ```

2. **Fetches Existing Bookings:**
   ```typescript
   // For each technician, gets their bookings in the date range
   tech.bookings = [
     { slotStart: "2025-01-15T10:00:00Z", slotEnd: "2025-01-15T11:30:00Z", customerName: "Alice" },
     { slotStart: "2025-01-15T14:00:00Z", slotEnd: "2025-01-15T15:30:00Z", customerName: "Bob" }
   ]
   ```

3. **Gets Available Slots from Cal.com:**
   ```typescript
   calcomSlots = [
     { start: "2025-01-15T08:00:00Z", end: "2025-01-15T08:30:00Z" },
     { start: "2025-01-15T09:00:00Z", end: "2025-01-15T09:30:00Z" },
     { start: "2025-01-15T10:00:00Z", end: "2025-01-15T10:30:00Z" },
     // ... more slots
   ]
   ```

4. **Checks Each Slot Against Technician Bookings:**
   ```typescript
   For each slot:
     For each technician:
       Check if technician has a booking that overlaps with this slot
       If NO overlap → Technician is available for this slot
       If overlap → Technician is busy
     
     If at least ONE technician is free → Slot is available
     If ALL technicians are busy → Slot is filtered out
   ```

5. **Assigns Technician to Each Available Slot:**
   ```typescript
   availableSlots = [
     {
       start: "2025-01-15T08:00:00Z",
       end: "2025-01-15T08:30:00Z",
       technicianId: "tech1",        // ← First available tech
       technicianName: "John Smith"  // ← Human-readable name
     },
     {
       start: "2025-01-15T09:00:00Z",
       end: "2025-01-15T09:30:00Z",
       technicianId: "tech2",
       technicianName: "Jane Doe"
     }
     // ... more slots
   ]
   ```

### Step 4: Response to AI
```json
{
  "result": "SUCCESS: Found 5 available slots. The first available time is Mon, Jan 15, 2:00 PM (technician: John Smith). Say to customer: 'I can get someone out there at Mon, Jan 15, 2:00 PM. Does that work?'",
  "slots": [
    {
      "start": "2025-01-15T14:00:00Z",
      "end": "2025-01-15T14:30:00Z",
      "technicianId": "tech1",
      "technicianName": "John Smith"
    },
    // ... more slots
  ]
}
```

### Step 5: AI Sees the Response
The AI reads the `result` field and sees:
- Available times
- Which technician is assigned to each slot (if included)
- A human-readable message to say to the customer

**The AI does NOT see:**
- Raw database records
- All technicians' full schedules
- Unassigned bookings
- The gaps calculation process

**The AI only sees:**
- Available slots with assigned technicians
- The formatted message telling it what to say

---

## How Technician Assignment Works

### Technician ID in Database
Each technician has a unique ID stored in the database:
```typescript
{
  id: "cmhl2abc123def456",  // ← Unique database ID (CUID)
  name: "John Smith",
  phone: "+12055551234",
  isActive: true,
  priority: 1,  // Higher priority = assigned first
  projectId: "project123"
}
```

### When Booking is Created
1. **AI calls `book_slot()`** with:
   ```json
   {
     "customerName": "Alice",
     "customerPhone": "5551234567",
     "address": "123 Main St",
     "startTime": "2025-01-15T14:00:00Z",
     "confirm": true
   }
   ```

2. **Backend finds available technician:**
   ```typescript
   // Checks which tech is free at this time
   availableTech = findAvailableTechnician(startTime, endTime)
   // Returns: { id: "tech1", name: "John Smith" }
   ```

3. **Booking is created with technicianId:**
   ```typescript
   booking = {
     id: "booking123",
     customerName: "Alice",
     slotStart: "2025-01-15T14:00:00Z",
     technicianId: "tech1",  // ← Assigned automatically
     projectId: "project123"
   }
   ```

4. **Booking is saved to database** with the technician ID linked

---

## How Gaps Are Calculated

### What is a "Gap"?
A gap is a time slot where:
- A booking exists but has no assigned technician (`technicianId = null`)
- OR a technician has free time between bookings

### Gap Calculation Process
The `/api/gaps` endpoint (used by the dashboard, not the AI):

1. **Fetches all unassigned bookings:**
   ```typescript
   unassignedBookings = bookings.filter(b => !b.technicianId)
   ```

2. **For each unassigned booking:**
   - Finds all active technicians
   - Checks which technicians are free at that time
   - Calculates distance/proximity from previous booking
   - Suggests best technician match

3. **Returns suggestions:**
   ```json
   {
     "gaps": [
       {
         "unassignedBooking": {
           "id": "booking123",
           "customerName": "Alice",
           "slotStart": "2025-01-15T14:00:00Z"
         },
         "suggestedTechnician": {
           "id": "tech1",
           "name": "John Smith",
           "reason": "2.5 mi, 8 min away (nearby)"
         }
       }
     ]
   }
   ```

**The AI does NOT see gaps directly** - it only sees available slots where technicians are already assigned.

---

## Key Points

### ✅ What the AI DOES See:
1. **Available slots** with assigned technicians (from `get_slots`)
2. **Technician names** in the readable response (e.g., "technician: John Smith")
3. **Booking confirmation** messages after booking

### ❌ What the AI DOES NOT See:
1. **Raw database records** - no direct database access
2. **All technicians' schedules** - only sees available slots
3. **Unassigned bookings** - only sees slots with assigned techs
4. **Gap calculations** - that's for the dashboard/admin view

### 🔄 The Flow:
```
Customer Call
    ↓
AI calls get_slots()
    ↓
Backend queries database
    ↓
Backend checks technician bookings
    ↓
Backend calculates available slots
    ↓
Backend assigns technician to each slot
    ↓
Backend returns formatted response
    ↓
AI reads response and tells customer
    ↓
Customer agrees
    ↓
AI calls book_slot()
    ↓
Backend creates booking with technicianId
    ↓
Booking saved to database
```

---

## Technician Identification

### In the Database:
- Each technician has a **unique ID** (CUID format: `cmhl2abc123...`)
- Technicians are linked to projects via `projectId`
- Bookings reference technicians via `technicianId` foreign key

### For the AI:
- The AI sees technician **names** (human-readable) in the `get_slots` response
- The AI doesn't need to know IDs - the backend handles that
- When booking, the backend uses the `technicianId` from the slot to assign the booking

### Example Response the AI Sees:
```
"SUCCESS: Found 5 available slots. The first available time is Mon, Jan 15, 2:00 PM (technician: John Smith)."
```

The AI can mention the technician name to the customer, but the backend uses the ID to actually assign the booking.

