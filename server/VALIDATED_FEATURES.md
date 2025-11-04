# Validated Market Features Implementation Plan

Based on market research showing 9/10 demand strength, here's how we're incorporating all validated features.

## ✅ Already Implemented / Foundation Exists

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| 24/7 availability | ✅ Ready | `server/src/index.ts` | Server runs continuously |
| Calendar integration foundation | ✅ Ready | `src/app/api/calcom/availability/route.ts` | Cal.com integration exists, extendable |
| Appointment booking | ✅ Foundation | `src/app/api/book/route.ts` | Booking API exists, needs OpenAI function implementation |
| Smart routing logic | ✅ Partial | `src/app/api/gaps/route.ts` | Technician assignment logic exists |

## 🚧 Must-Have Features (Priority 1 - Week 2)

### 1. Emergency vs Routine Call Triage ⚡
**Market Validation**: Critical - reduces technician burnout by 40-60%, cited as "desperately needed"

**Implementation Plan**:
- **File**: `server/src/realtime-agent.ts` → `buildSystemPrompt()`
- **Add**: Trade-specific triage questions based on trade type (plumbing/HVAC/electrical)
- **Logic**: 
  ```typescript
  - Plumbing: "Is water actively leaking?" / "Burst pipe?" → Emergency
  - HVAC: "No heat with children/elderly?" / "System off >24hrs?" → Emergency
  - Electrical: "Sparks/smoke?" / "Power outage in whole house?" → Emergency
  ```
- **Routing**: Emergency → immediate booking, Routine → next-day appointment
- **Week 2, Days 6-7**

### 2. Call Recording and Transcription 📝
**Market Validation**: Critical - Ruby Receptionists failing because "no call recording", customers need transcripts

**Implementation Plan**:
- **Files**: 
  - `server/src/realtime-agent.ts` → capture transcription events
  - `prisma/schema.prisma` → ensure `Call` model has transcript fields
  - `server/src/session-manager.ts` → store transcripts on session end
- **Events to capture**:
  - `conversation.item.input_audio_transcription.completed` (customer speech)
  - `response.audio_transcript.done` (AI speech)
- **Storage**: Store full transcript + timestamped segments
- **Week 2, Day 8**

### 3. Trade-Specific Knowledge Base 🧠
**Market Validation**: High - Generic services "don't understand trade business context"

**Implementation Plan**:
- **File**: `server/src/realtime-agent.ts` → `buildSystemPrompt()`
- **Enhance**: Expand trade-specific context for plumbing/HVAC/electrical
- **Add**: Trade-specific terminology, common issues, service types
- **Integration**: Connect to existing `src/app/api/knowledge/route.ts` 
- **Week 2, Days 6-7**

## ⚡ High-Value Features (Priority 2 - Week 2-3)

### 4. SMS Auto-Response to Missed Calls 📱
**Market Validation**: 9/10 - "Desperately needed", users doing manually every day

**Implementation Plan**:
- **Files**:
  - `server/src/twilio/routes.ts` → detect missed calls
  - `server/src/twilio/sms-handler.ts` (NEW) → send auto-response
- **Logic**:
  - Detect missed call → immediately send SMS
  - Include booking link: "Sorry we missed you! Book here: [link]"
  - Include callback option
- **Integration**: Use existing Twilio SMS in codebase
- **Week 2, Day 9**

### 5. ServiceTitan Calendar Integration 🔌
**Market Validation**: 8/10 - ServiceTitan users reporting "integration chaos", highest willingness to pay

**Implementation Plan**:
- **Files**:
  - `server/src/integrations/servicetitan.ts` (NEW)
  - `server/src/realtime-agent.ts` → add ServiceTitan tools
- **Features**:
  - Real-time calendar sync
  - Prevent duplicate bookings
  - Auto-populate customer records
  - Technician routing based on ServiceTitan schedule
- **API**: ServiceTitan REST API
- **Week 3, Days 11-12**

### 6. Jobber Calendar Integration 🔌
**Market Validation**: High - Jobber users tech-savvy, understand integration value

**Implementation Plan**:
- **Files**:
  - `server/src/integrations/jobber.ts` (NEW)
- **Similar to ServiceTitan** - same features
- **Week 3, Day 13**

### 7. HousecallPro Calendar Integration 🔌
**Market Validation**: 7/10 - Users want integrated phone system, currently using expensive add-ons

**Implementation Plan**:
- **Files**:
  - `server/src/integrations/housecallpro.ts` (NEW)
- **API**: HousecallPro REST API
- **Week 3, Day 14**

### 8. Smart On-Call Routing 📞
**Market Validation**: 9/10 - MAP Communications "contacting wrong technician 3+ times weekly"

**Implementation Plan**:
- **Files**:
  - `server/src/routing/on-call-router.ts` (NEW)
  - `server/src/realtime-agent.ts` → integrate routing logic
- **Logic**:
  - Check real-time schedule from integrated calendar
  - Route by: time of day, technician specialty, location, availability
  - Automatic fallback if primary technician unavailable
- **Integration**: Works with ServiceTitan/Jobber/HousecallPro
- **Week 3, Day 15**

### 9. Bilingual Support (English/Spanish) 🌎
**Market Validation**: High value - Large Spanish-speaking customer base in trades

**Implementation Plan**:
- **Files**:
  - `server/src/realtime-agent.ts` → language detection/preference
  - `prisma/schema.prisma` → add `preferredLanguage` to Agent
- **Logic**:
  - Detect language from first customer utterance OR
  - Use agent preference setting
  - Adjust system prompt based on language
- **OpenAI**: Native Spanish support
- **Week 4, Days 16-17**

### 10. CRM Customer History Integration 👤
**Market Validation**: High value - Improves context for repeat customers

**Implementation Plan**:
- **Files**:
  - `server/src/realtime-agent.ts` → add `get_customer_history` function
  - `server/src/functions/customer-history.ts` (NEW)
- **Logic**:
  - Query existing bookings by phone number
  - Provide context: "Last service: [date], [issue], [technician]"
  - Help AI personalize conversation
- **Data Source**: Existing Prisma database (Bookings, Customers)
- **Week 4, Day 18**

## 📊 Implementation Timeline

| Week | Days | Features | Priority |
|------|------|----------|----------|
| **Week 2** | 6-7 | Emergency triage, Trade knowledge | 🔥 Must-have |
| **Week 2** | 8 | Call recording/transcription | 🔥 Must-have |
| **Week 2** | 9 | SMS missed-call response | ⚡ High-value |
| **Week 2** | 10 | Testing & refinement | - |
| **Week 3** | 11-12 | ServiceTitan integration | ⚡ High-value |
| **Week 3** | 13 | Jobber integration | ⚡ High-value |
| **Week 3** | 14 | HousecallPro integration | ⚡ High-value |
| **Week 3** | 15 | Smart on-call routing | ⚡ High-value |
| **Week 4** | 16-17 | Bilingual support | ⚡ High-value |
| **Week 4** | 18 | CRM history integration | ⚡ High-value |
| **Week 4** | 19-20 | Testing, optimization | - |

## 🎯 Market-Aligned Pricing Strategy

Based on research findings:
- **Solo operators**: $99-149/month (can't justify $400+)
- **Mid-market (10-20 employees)**: $149-299/month (saves $15K-25K/year)
- **Enterprise**: $299-499/month (ServiceTitan users paying $400-600+)

**Competitive positioning**:
- "1/4 the price of Ruby Receptionists"
- "More accurate than human services"
- "Schedule Engine replacement" (for ServiceTitan users)

## ✅ Feature Validation Checklist

- [x] 24/7 availability
- [ ] Emergency triage (Week 2)
- [ ] Call recording/transcription (Week 2)
- [x] Calendar integration foundation
- [ ] ServiceTitan integration (Week 3)
- [ ] Jobber integration (Week 3)
- [ ] HousecallPro integration (Week 3)
- [ ] Appointment booking (full implementation Week 2)
- [ ] SMS missed-call response (Week 2)
- [ ] Smart on-call routing (Week 3)
- [ ] Bilingual support (Week 4)
- [ ] CRM history (Week 4)
- [ ] Trade-specific knowledge (Week 2)

## 🚀 Competitive Advantages from Research

1. **Price**: 60-70% cheaper than Ruby Receptionists
2. **Accuracy**: No human error (transcription, routing, information capture)
3. **Integration**: Native ServiceTitan/Jobber/HousecallPro (vs. Schedule Engine chaos)
4. **Triage**: Intelligent emergency vs routine (vs. generic operators)
5. **Transparency**: Full call recording + transcripts (vs. Ruby's "no recording")
6. **No billing surprises**: Flat-rate unlimited (vs. $5K overrun horror stories)

---

**Status**: All validated features are feasible and align with our Week 1-4 roadmap. Market demand is 9/10 - we're building exactly what trade businesses are desperately seeking.
