# OpenAI Realtime API Migration Guide

## Overview

This document outlines everything needed to migrate AfterHourFix from **Vapi** to **OpenAI Realtime API** for voice agent functionality.

---

## 🏗️ Architecture Changes

### Current State (Vapi)
- **Telephony**: Vapi handles PSTN → WebSocket → AI
- **Voice**: Vapi manages TTS/STT (ElevenLabs, Deepgram, Cartesia)
- **Function Calling**: Webhook-based (`tool-calls` events)
- **Phone Numbers**: Vapi BYO (Twilio numbers)
- **Infrastructure**: Vapi handles all real-time audio streaming

### Target State (OpenAI Realtime)
- **Telephony**: You build PSTN → Media Server → WebSocket → OpenAI
- **Voice**: OpenAI handles TTS/STT natively
- **Function Calling**: Native OpenAI function calling
- **Phone Numbers**: Direct Twilio integration
- **Infrastructure**: You build and manage WebSocket server + media handling

---

## 📋 Required Components

### 1. WebSocket Server Infrastructure

**What's Needed:**
- Persistent WebSocket server (separate from Next.js API routes)
- Handle concurrent connections (one per active call)
- Manage WebSocket lifecycle (connect, message, disconnect)
- Connection pooling/load balancing

**Options:**
- **Option A**: Separate Node.js server (Express + `ws`)
  ```typescript
  // server/realtime-server.ts
  import { WebSocketServer } from 'ws'
  import { createServer } from 'http'
  
  const wss = new WebSocketServer({ port: 8080 })
  // Handle OpenAI Realtime API connections
  ```
- **Option B**: Vercel Edge Functions (limited - may not support WebSocket persistence)
- **Option C**: Railway/Render/DigitalOcean Droplet (full control)

**Estimated Effort**: 2-3 days

---

### 2. Media Server (PSTN → WebRTC/WebSocket)

**What's Needed:**
- Bridge between Twilio PSTN and OpenAI Realtime WebSocket
- Audio codec conversion (PCM, Opus, etc.)
- Buffer management for real-time audio streaming
- Handle DTMF tones, hold music, transfers

**Options:**
- **Twilio Media Streams** (Recommended)
  - Streams audio directly from Twilio calls
  - WebSocket API for bidirectional audio
  - Built-in support for Opus/PCM conversion
- **Vonage Voice API** (Alternative)
  - Similar WebSocket streaming
- **Custom WebRTC Server** (Complex)
  - Use `mediasoup` or `janus-gateway`
  - Maximum control, maximum complexity

**Twilio Media Streams Setup:**
```typescript
// src/lib/twilio-media-streams.ts
export async function createMediaStream(callSid: string) {
  const client = twilio(ACCOUNT_SID, AUTH_TOKEN)
  
  await client.calls(callSid).update({
    twiml: `<Response>
      <Start>
        <Stream url="wss://your-server.com/media-stream" />
      </Start>
    </Response>`
  })
  
  // Now handle incoming WebSocket from Twilio
  // Convert Twilio audio → OpenAI Realtime format
}
```

**Estimated Effort**: 3-5 days

---

### 3. OpenAI Realtime API Client

**What's Needed:**
- WebSocket client for OpenAI Realtime API
- Handle session creation, events, audio chunks
- Implement function calling
- Manage conversation state

**OpenAI Realtime API Flow:**
```typescript
// src/lib/openai-realtime.ts
import { createClient } from '@openai/realtime-api'

export class RealtimeAgent {
  private client: ReturnType<typeof createClient>
  private sessionId: string | null = null
  
  async connect(projectId: string, agentId: string) {
    // Create session
    const session = await this.client.createSession({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy', // or 'echo', 'shimmer', etc.
      instructions: this.buildSystemPrompt(projectId),
      tools: this.buildTools(projectId),
    })
    
    this.sessionId = session.id
    
    // Handle events
    this.client.on('event', (event) => {
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        // User spoke - handle transcription
      }
      if (event.type === 'response.audio_transcript.delta') {
        // AI is speaking - send to Twilio
      }
      if (event.type === 'response.function_call_arguments.completed') {
        // Function call - execute and return result
      }
    })
  }
  
  async sendAudio(audioChunk: Buffer) {
    // Convert Twilio audio → OpenAI format
    await this.client.inputAudioBuffer.append(audioChunk)
  }
}
```

**Key Events to Handle:**
- `response.audio_transcript.delta` - AI speech chunks
- `response.function_call_arguments.completed` - Function calls
- `conversation.item.input_audio_transcription.completed` - User speech
- `response.done` - Response complete
- `error` - Error handling

**Estimated Effort**: 2-3 days

---

### 4. Function Calling Migration

**Current (Vapi Webhook):**
```typescript
// Vapi sends tool-calls event to webhook
// You return results in { results: [{ toolCallId, result }] }
```

**New (OpenAI Native):**
```typescript
// OpenAI sends function_call events directly
// You execute functions and return results via SDK

client.on('event', async (event) => {
  if (event.type === 'response.function_call_arguments.completed') {
    const functionCall = event.function_call
    
    // Execute function
    let result: any
    if (functionCall.name === 'book_slot') {
      result = await bookSlot(functionCall.arguments)
    } else if (functionCall.name === 'get_slots') {
      result = await getAvailableSlots(functionCall.arguments)
    }
    
    // Submit result back to OpenAI
    await client.submitToolOutputs({
      tool_call_id: functionCall.id,
      result: JSON.stringify(result),
    })
  }
})
```

**Function Definitions:**
```typescript
const tools = [
  {
    type: 'function',
    name: 'book_slot',
    description: 'Book an appointment...',
    parameters: {
      type: 'object',
      properties: {
        customerName: { type: 'string' },
        // ... same as current
      },
    },
  },
  // ... other tools
]
```

**Estimated Effort**: 1-2 days (mostly copy/paste existing logic)

---

### 5. Phone Number Management

**Current (Vapi BYO):**
- Purchase Twilio number → Add to Vapi → Done

**New (Direct Twilio):**
```typescript
// src/lib/phone-numbers.ts
export async function configurePhoneNumber(
  phoneNumber: string,
  agentId: string
) {
  const client = twilio(ACCOUNT_SID, AUTH_TOKEN)
  
  // Create TwiML app that routes to your media stream
  await client.applications.create({
    friendlyName: `AfterHourFix ${agentId}`,
    voiceUrl: `https://your-api.com/twilio/voice/${agentId}`,
    voiceMethod: 'POST',
  })
  
  // Update phone number to use this app
  await client.incomingPhoneNumbers(phoneNumber).update({
    voiceApplicationSid: appSid,
  })
}

// src/app/api/twilio/voice/route.ts
export async function POST(req: NextRequest) {
  const { CallSid, From, To } = await req.formData()
  
  // Get agent config from database
  const agent = await getAgentByPhoneNumber(To)
  
  // Create media stream connection
  await createMediaStream(CallSid, agent.id)
  
  // Return TwiML to start stream
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Start>
        <Stream url="wss://your-server.com/media-stream" />
      </Start>
    </Response>`, {
    headers: { 'Content-Type': 'text/xml' },
  })
}
```

**Estimated Effort**: 1-2 days

---

### 6. Database Schema Changes

**No major changes needed**, but consider:

```prisma
model Agent {
  // ... existing fields
  
  // Remove Vapi-specific fields
  // vapiAssistantId  String  // DELETE THIS
  
  // Add OpenAI Realtime fields
  openaiRealtimeSessionId  String?  // Track active sessions
  twilioPhoneNumberId      String?  // Direct Twilio number reference
}

model Call {
  // ... existing fields
  
  // Update tracking
  openaiSessionId  String?  // Instead of vapiCallId
  twilioCallSid    String?  // Store Twilio call SID
}
```

**Estimated Effort**: 1 day

---

### 7. Audio Format Conversion ✅ **SOLVED WITH EXISTING LIBRARIES**

**Good News**: Audio conversion/resampling is a **well-solved problem**. You don't need to build this from scratch!

**OpenAI Realtime Requirements:**
- **Input**: PCM 16-bit, 24kHz, mono
- **Output**: Opus or PCM (configurable)

**Twilio Media Streams:**
- **Format**: μ-law or PCM, 8kHz
- **Chunk Size**: 20ms chunks

**✅ Recommended Solution: Use `speexdsp` (Native, Fast)**

```bash
npm install speexdsp
```

```typescript
// src/lib/audio-converter.ts
import { Resampler } from 'speexdsp'

// Convert Twilio μ-law 8kHz → OpenAI PCM 24kHz
export function convertTwilioToOpenAI(twilioAudio: Buffer): Buffer {
  // 1. Convert μ-law → PCM 16-bit (8kHz)
  const pcm8k = mulawToLinear16(twilioAudio)
  
  // 2. Resample 8kHz → 24kHz using speexdsp
  const resampler = new Resampler({
    inputSampleRate: 8000,
    outputSampleRate: 24000,
    channels: 1,
  })
  
  return Buffer.from(resampler.process(pcm8k))
}

// Convert OpenAI PCM 24kHz → Twilio μ-law 8kHz
export function convertOpenAIToTwilio(openaiAudio: Buffer): Buffer {
  // 1. Resample 24kHz → 8kHz
  const resampler = new Resampler({
    inputSampleRate: 24000,
    outputSampleRate: 8000,
    channels: 1,
  })
  
  const pcm8k = Buffer.from(resampler.process(openaiAudio))
  
  // 2. Convert PCM → μ-law
  return linear16ToMulaw(pcm8k)
}

// Helper: μ-law ↔ PCM conversion (use existing library or simple lookup table)
function mulawToLinear16(mulaw: Buffer): Buffer {
  // Use existing library like 'mulaw' package
  // npm install mulaw
  const { decode } = require('mulaw')
  return decode(mulaw)
}

function linear16ToMulaw(pcm: Buffer): Buffer {
  const { encode } = require('mulaw')
  return encode(pcm)
}
```

**Alternative Libraries (All Proven Solutions):**

1. **`speexdsp`** ⭐ **RECOMMENDED**
   - Native C bindings, very fast
   - Used by VoIP systems worldwide
   - Zero external dependencies
   - GitHub: `https://github.com/jitsi/libresampler` or `npm install speexdsp`

2. **`@ffmpeg-installer/ffmpeg` + `fluent-ffmpeg`**
   - Industry standard, handles all formats
   - Heavier (requires FFmpeg binary)
   - Most flexible
   - GitHub: Many examples available

3. **`sox` (via child_process)**
   - Command-line tool
   - Requires `sox` installed on server
   - Good for batch processing

4. **`audio-resampler` (JavaScript)**
   - Pure JS, no native dependencies
   - Slower but easier to deploy
   - GitHub: `https://github.com/jaz303/audio-resampler`

**🎯 Best GitHub Sample to Copy:**

**Twilio + OpenAI Realtime Integration Example:**
- OpenAI's official examples: `https://github.com/openai/realtime-api-sdk`
- Look for `examples/telephony/` or similar
- Many community examples on GitHub search: "twilio openai realtime"

**Complete Working Example:**
```typescript
// Example from community (search GitHub for "twilio openai realtime")
import { Resampler } from 'speexdsp'
import { decode, encode } from 'mulaw'

export class AudioConverter {
  private upsampler = new Resampler({ inputSampleRate: 8000, outputSampleRate: 24000, channels: 1 })
  private downsampler = new Resampler({ inputSampleRate: 24000, outputSampleRate: 8000, channels: 1 })
  
  twilioToOpenAI(mulaw8k: Buffer): Buffer {
    const pcm8k = decode(mulaw8k)
    return Buffer.from(this.upsampler.process(pcm8k))
  }
  
  openAIToTwilio(pcm24k: Buffer): Buffer {
    const pcm8k = Buffer.from(this.downsampler.process(pcm24k))
    return encode(pcm8k)
  }
}
```

**Installation:**
```bash
npm install speexdsp mulaw
# or
npm install @ffmpeg-installer/ffmpeg fluent-ffmpeg
```

**✅ Estimated Effort**: **0.5-1 day** (just integrate existing library, not build from scratch!)

---

### 8. Session Management & State

**What's Needed:**
- Track active call sessions (WebSocket connections)
- Store conversation state per call
- Handle reconnection logic
- Cleanup on call end

**Implementation:**
```typescript
// src/lib/call-session-manager.ts
class CallSessionManager {
  private sessions = new Map<string, CallSession>()
  
  async createSession(callSid: string, agentId: string) {
    const agent = await getAgent(agentId)
    const project = await getProject(agent.projectId)
    
    // Create OpenAI Realtime session
    const realtimeAgent = new RealtimeAgent()
    await realtimeAgent.connect(project.id, agent.id)
    
    // Store session
    const session: CallSession = {
      callSid,
      agentId,
      realtimeAgent,
      startTime: new Date(),
      state: 'active',
    }
    
    this.sessions.set(callSid, session)
    
    // Store in database
    await prisma.call.create({
      data: {
        callSid,
        agentId,
        status: 'active',
        openaiSessionId: realtimeAgent.sessionId,
      },
    })
    
    return session
  }
  
  async endSession(callSid: string) {
    const session = this.sessions.get(callSid)
    if (!session) return
    
    // Close OpenAI session
    await session.realtimeAgent.disconnect()
    
    // Update database
    await prisma.call.update({
      where: { callSid },
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    })
    
    this.sessions.delete(callSid)
  }
}
```

**Estimated Effort**: 1-2 days

---

### 9. Monitoring & Logging

**What's Needed:**
- Log all WebSocket events
- Track audio quality metrics
- Monitor OpenAI API usage/costs
- Alert on failures

**Implementation:**
```typescript
// Add logging to all critical paths
client.on('event', (event) => {
  console.log('[OpenAI Realtime]', event.type, event)
  
  // Store in database for analytics
  await prisma.eventLog.create({
    data: {
      type: `openai.realtime.${event.type}`,
      payload: event,
    },
  })
})
```

**Estimated Effort**: 1 day

---

### 10. Cost Comparison

**Current (Vapi):**
- Vapi charges per minute (varies by tier)
- Plus underlying OpenAI API costs
- Plus Twilio phone number costs (~$1/month)

**New (OpenAI Realtime Direct):**
- OpenAI Realtime API: ~$0.18/minute for GPT-4o Realtime
- Twilio Media Streams: ~$0.004/minute
- Twilio phone numbers: ~$1/month
- Your infrastructure: Hosting costs

**Estimated Savings:**
- **Vapi**: ~$0.40-0.60/minute (estimated)
- **Direct**: ~$0.18/minute + infrastructure
- **Potential Savings**: 30-50% (if high volume)

**Break-even Point:**
- Need significant call volume to offset infrastructure development costs
- Consider: Development time, ongoing maintenance, scaling challenges

---

## 📊 Implementation Roadmap

### Phase 1: Proof of Concept (Week 1-2)
1. ✅ Set up WebSocket server (separate from Next.js)
2. ✅ Implement basic Twilio Media Streams connection
3. ✅ Connect to OpenAI Realtime API
4. ✅ Test basic audio flow (Twilio → OpenAI → Twilio)
5. ✅ Implement one function call (e.g., `get_slots`)

### Phase 2: Core Features (Week 3-4)
1. ✅ Implement all function calls (book_slot, get_pricing, etc.)
2. ✅ Audio format conversion (8kHz ↔ 24kHz) - **Use `speexdsp` library (0.5-1 day)**
3. ✅ Session management
4. ✅ Database integration
5. ✅ Error handling & reconnection logic

### Phase 3: Production Ready (Week 5-6)
1. ✅ Phone number provisioning UI
2. ✅ Call logging & analytics
3. ✅ Monitoring & alerts
4. ✅ Load testing
5. ✅ Documentation

### Phase 4: Migration (Week 7)
1. ✅ Dual-mode support (Vapi + OpenAI Realtime)
2. ✅ Gradual migration (per-agent)
3. ✅ Monitoring & rollback plan
4. ✅ Decommission Vapi

---

## ⏱️ Detailed Task Timeline

### **Week 1: Infrastructure Setup**

| Day | Task | Duration | Dependencies | Owner |
|-----|------|----------|--------------|-------|
| **Day 1** | **Project Setup** | 4 hours | None | Backend Dev |
| | - Create new repo/folder for WebSocket server | 1h | | |
| | - Set up Node.js + TypeScript + Express | 1h | | |
| | - Install dependencies (`ws`, `@openai/realtime-api`, `twilio`) | 1h | | |
| | - Basic project structure & config | 1h | | |
| **Day 1** | **WebSocket Server Foundation** | 4 hours | Project Setup | Backend Dev |
| | - Create WebSocket server with `ws` library | 2h | | |
| | - Handle connection lifecycle (connect, disconnect, error) | 1h | | |
| | - Connection tracking (in-memory Map) | 1h | | |
| **Day 2** | **Twilio Media Streams Integration** | 6 hours | WebSocket Server | Backend Dev |
| | - Set up Twilio client & test account | 1h | | |
| | - Create TwiML endpoint for call handling | 2h | | |
| | - Implement Media Streams WebSocket handler | 2h | | |
| | - Test: Receive audio chunks from Twilio | 1h | | |
| **Day 3** | **OpenAI Realtime API Client** | 6 hours | Twilio Integration | Backend Dev |
| | - Set up OpenAI Realtime SDK | 1h | | |
| | - Create session manager class | 2h | | |
| | - Handle session creation & events | 2h | | |
| | - Test: Connect to OpenAI Realtime API | 1h | | |
| **Day 4** | **Audio Pipeline - Basic** | 6 hours | Both integrations | Backend Dev |
| | - Install audio libraries (`speexdsp`, `mulaw`) | 1h | | |
| | - Create audio converter class | 2h | | |
| | - Connect Twilio → OpenAI (one-way audio) | 2h | | |
| | - Test: Echo audio back through pipeline | 1h | | |
| **Day 5** | **Bidirectional Audio Flow** | 6 hours | Audio Pipeline | Backend Dev |
| | - Implement OpenAI → Twilio audio conversion | 2h | | |
| | - Handle audio chunks from OpenAI events | 2h | | |
| | - Buffer management & chunking | 1h | | |
| | - **POC Complete: Full audio loop working** | 1h | | |

**Week 1 Total: 26 hours (~3.25 days with testing)**

---

### **Week 2: Function Calling & Core Features**

| Day | Task | Duration | Dependencies | Owner |
|-----|------|----------|--------------|-------|
| **Day 6** | **Function Calling Foundation** | 6 hours | Week 1 complete | Backend Dev |
| | - Design tool schema for OpenAI | 1h | | |
| | - Create tool definitions (migrate from Vapi) | 2h | | |
| | - Implement function call event handler | 2h | | |
| | - Test: OpenAI calls a dummy function | 1h | | |
| **Day 7** | **Migrate `get_slots` Function** | 4 hours | Function Foundation | Backend Dev |
| | - Port `get_slots` logic from Vapi webhook | 2h | | |
| | - Adapt to OpenAI function calling format | 1h | | |
| | - Test: AI calls `get_slots` during call | 1h | | |
| **Day 8** | **Migrate `get_pricing` Function** | 3 hours | Function Foundation | Backend Dev |
| | - Port `get_pricing` logic | 1.5h | | |
| | - Test with OpenAI function calling | 1.5h | | |
| **Day 9** | **Migrate `book_slot` Function** | 4 hours | Function Foundation | Backend Dev |
| | - Port `book_slot` logic | 2h | | |
| | - Handle Cal.com booking integration | 1h | | |
| | - Test: End-to-end booking during call | 1h | | |
| **Day 10** | **Migrate Remaining Functions** | 4 hours | Function Foundation | Backend Dev |
| | - Port `check_service_area` | 1h | | |
| | - Port `get_knowledge` (if needed) | 1h | | |
| | - Test all functions together | 2h | | |
| **Day 11** | **Audio Quality Optimization** | 4 hours | All functions | Backend Dev |
| | - Fine-tune audio conversion parameters | 2h | | |
| | - Test latency & quality with real calls | 2h | | |
| **Day 12** | **Week 2 Testing & Bug Fixes** | 4 hours | Everything | Backend Dev |
| | - End-to-end call testing | 2h | | |
| | - Fix any bugs discovered | 2h | | |

**Week 2 Total: 29 hours (~3.6 days with testing)**

---

### **Week 3: Session Management & Database**

| Day | Task | Duration | Dependencies | Owner |
|-----|------|----------|--------------|-------|
| **Day 13** | **Database Schema Updates** | 3 hours | None | Backend Dev |
| | - Update Prisma schema (add OpenAI fields) | 1h | | |
| | - Run migrations | 0.5h | | |
| | - Update TypeScript types | 0.5h | | |
| | - Test database changes | 1h | | |
| **Day 14** | **Session Manager Implementation** | 6 hours | Database Schema | Backend Dev |
| | - Create `CallSessionManager` class | 2h | | |
| | - Implement session creation (DB + in-memory) | 2h | | |
| | - Implement session cleanup on call end | 1h | | |
| | - Test: Sessions persist across restarts | 1h | | |
| **Day 15** | **Database Integration** | 6 hours | Session Manager | Backend Dev |
| | - Store calls in database | 2h | | |
| | - Store function call results | 1h | | |
| | - Store call transcripts | 2h | | |
| | - Test: Data flows to database | 1h | | |
| **Day 16** | **Error Handling & Reconnection** | 6 hours | Database Integration | Backend Dev |
| | - Implement reconnection logic for WebSockets | 2h | | |
| | - Handle OpenAI API errors gracefully | 2h | | |
| | - Handle Twilio disconnections | 1h | | |
| | - Test: Resilience under failure scenarios | 1h | | |
| **Day 17** | **Phone Number Management API** | 4 hours | Error Handling | Backend Dev |
| | - Create API endpoint for phone number config | 2h | | |
| | - Implement Twilio phone number provisioning | 1h | | |
| | - Test: New phone numbers route correctly | 1h | | |
| **Day 18** | **Week 3 Testing & Polish** | 4 hours | Everything | Backend Dev |
| | - Integration testing | 2h | | |
| | - Performance testing (concurrent calls) | 1h | | |
| | - Bug fixes | 1h | | |

**Week 3 Total: 29 hours (~3.6 days with testing)**

---

### **Week 4: Production Features**

| Day | Task | Duration | Dependencies | Owner |
|-----|------|----------|--------------|-------|
| **Day 19** | **Call Logging & Analytics** | 6 hours | Week 3 complete | Backend Dev |
| | - Log all WebSocket events to database | 2h | | |
| | - Create call analytics queries | 2h | | |
| | - Track metrics (duration, function calls, errors) | 2h | | |
| **Day 20** | **Monitoring & Alerts** | 6 hours | Call Logging | Backend Dev |
| | - Set up error tracking (Sentry) | 2h | | |
| | - Create health check endpoint | 1h | | |
| | - Implement alerting for failures | 2h | | |
| | - Test: Alerts fire on errors | 1h | | |
| **Day 21** | **Phone Number Management UI** | 6 hours | Phone API | Frontend Dev |
| | - Create UI for adding phone numbers | 2h | | |
| | - Display active phone numbers | 1h | | |
| | - Test phone number routing | 1h | | |
| | - Polish UI/UX | 2h | | |
| **Day 22** | **Dashboard Integration** | 4 hours | Analytics | Frontend Dev |
| | - Update dashboard to show OpenAI calls | 2h | | |
| | - Add OpenAI-specific metrics | 1h | | |
| | - Test: Dashboard displays correct data | 1h | | |
| **Day 23** | **Load Testing** | 4 hours | Everything | Backend Dev |
| | - Set up load testing tool (k6 or Artillery) | 1h | | |
| | - Test concurrent call handling (10+ calls) | 2h | | |
| | - Optimize based on results | 1h | | |
| **Day 24** | **Documentation** | 4 hours | Everything | Tech Writer |
| | - API documentation | 1h | | |
| | - Deployment guide | 1h | | |
| | - Troubleshooting guide | 1h | | |
| | - Architecture diagrams | 1h | | |

**Week 4 Total: 30 hours (~3.75 days with testing)**

---

### **Week 5: Migration & Rollout**

| Day | Task | Duration | Dependencies | Owner |
|-----|------|----------|--------------|-------|
| **Day 25** | **Dual-Mode Support** | 6 hours | Week 4 complete | Backend Dev |
| | - Add feature flag for OpenAI vs Vapi | 1h | | |
| | - Update routing logic (per-agent selection) | 2h | | |
| | - Test: Both systems work simultaneously | 2h | | |
| | - Create admin UI to toggle mode | 1h | | |
| **Day 26** | **Migration Script** | 4 hours | Dual-Mode | Backend Dev |
| | - Script to migrate phone numbers | 2h | | |
| | - Data migration (if needed) | 1h | | |
| | - Rollback script | 1h | | |
| **Day 27** | **Pilot Migration (1-2 agents)** | 4 hours | Migration Script | DevOps |
| | - Migrate test agent to OpenAI Realtime | 1h | | |
| | - Monitor for 24 hours | 2h | | |
| | - Gather feedback & metrics | 1h | | |
| **Day 28** | **Fix Issues from Pilot** | 4 hours | Pilot Migration | Backend Dev |
| | - Address any bugs found | 2h | | |
| | - Performance optimizations | 1h | | |
| | - Re-test | 1h | | |
| **Day 29** | **Gradual Rollout** | 4 hours | Issues Fixed | DevOps |
| | - Migrate 25% of agents | 1h | | |
| | - Monitor for 48 hours | 2h | | |
| | - Migrate another 25% if stable | 1h | | |
| **Day 30** | **Full Migration** | 4 hours | Gradual Rollout | DevOps |
| | - Migrate remaining agents | 1h | | |
| | - Monitor for 1 week | 2h | | |
| | - Decommission Vapi integration | 1h | | |

**Week 5 Total: 26 hours (~3.25 days, mostly monitoring)**

---

## 📅 Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Week 1: Infrastructure** | 26 hours | Working audio pipeline (Twilio ↔ OpenAI) |
| **Week 2: Functions** | 29 hours | All function calls working |
| **Week 3: Database & Session** | 29 hours | Persistent sessions, database integration |
| **Week 4: Production** | 30 hours | Monitoring, UI, load testing |
| **Week 5: Migration** | 26 hours | Full migration complete |
| **TOTAL** | **140 hours** | **~17.5 working days (3.5 weeks)** |

---

## 🚀 Fast-Track Timeline (Aggressive)

If you have 2 developers working in parallel:

| Phase | Duration | Parallelization |
|-------|----------|-----------------|
| **Week 1** | 3 days | Backend: Infrastructure, Frontend: Prep UI |
| **Week 2** | 3 days | Backend: Functions, Frontend: UI components |
| **Week 3** | 2 days | Backend: DB & Session, Frontend: Dashboard |
| **Week 4** | 2 days | Both: Testing & polish |
| **TOTAL** | **10 days** | **2 weeks with 2 devs** |

---

## ⚠️ Buffer Time Recommendations

- **Add 20% buffer** for unexpected issues: **140h → 168h (4 weeks)**
- **Conservative estimate**: **5-6 weeks** (includes testing, bug fixes, deployment)
- **With 2 developers**: **2-3 weeks** (parallelization)

---

## 🚧 Challenges & Risks

### 1. **Infrastructure Complexity**
- **Risk**: Need to manage WebSocket connections, audio streaming, codec conversion
- **Mitigation**: Start with Twilio Media Streams (simplest path)

### 2. **Latency**
- **Risk**: Audio conversion adds latency (50-100ms)
- **Mitigation**: Optimize audio pipeline, use efficient codecs

### 3. **Scaling**
- **Risk**: WebSocket server needs to handle concurrent calls
- **Mitigation**: Use load balancer, horizontal scaling

### 4. **Audio Quality**
- **Risk**: Resampling (8kHz → 24kHz) may affect quality
- **Mitigation**: Use proven libraries like `speexdsp` (used by VoIP systems worldwide), test with real calls

### 5. **Development Time**
- **Risk**: 4-6 weeks of development time
- **Mitigation**: Phased approach, keep Vapi as fallback

### 6. **Maintenance Burden**
- **Risk**: You now own the entire audio pipeline
- **Mitigation**: Comprehensive logging, monitoring, error handling

---

## ✅ Recommended Approach

### Option 1: **Hybrid Approach** (Recommended)
- Keep Vapi for existing customers
- Offer OpenAI Realtime as "Premium" option for new customers
- Gradually migrate high-volume customers
- Compare costs & quality over 3-6 months

### Option 2: **Full Migration**
- Commit to full migration
- Build in phases with Vapi as fallback
- Migrate all customers once stable

### Option 3: **Stay on Vapi**
- Vapi handles complexity for you
- Focus on product features, not infrastructure
- Accept higher per-minute costs for simplicity

---

## 🔧 Technical Stack Recommendations

**WebSocket Server:**
- Node.js + Express + `ws` library
- Or: Go with `gorilla/websocket` (better performance)

**Audio Processing:**
- `@ffmpeg-installer/ffmpeg` + `fluent-ffmpeg` (Node.js)
- Or: Native audio processing library (`speexdsp`)

**Hosting:**
- Railway/Render for WebSocket server (persistent connections)
- Vercel for API routes (stateless)
- Twilio for PSTN

**Monitoring:**
- Sentry for error tracking
- Datadog/New Relic for metrics
- Custom dashboard for call analytics

---

## 📝 Next Steps

If you want to proceed:

1. **Week 1**: Build POC with Twilio Media Streams + OpenAI Realtime
2. **Week 2**: Test audio quality, implement one function call
3. **Week 3**: Decide on full migration vs. hybrid approach
4. **Week 4+**: Execute chosen approach

**Estimated Total Time**: 3-5 weeks (reduced from 4-6 weeks thanks to audio libraries)
**Estimated Cost Savings**: 30-50% per minute (if high volume)
**Risk Level**: Medium (infrastructure complexity, but audio conversion is solved)

---

## 🤔 Should You Do This?

**Do this if:**
- ✅ You have high call volume (>1000 minutes/month)
- ✅ You want full control over the audio pipeline
- ✅ You're willing to maintain infrastructure
- ✅ Cost savings justify development time

**Don't do this if:**
- ❌ You want to focus on product features, not infrastructure
- ❌ You have low call volume (<500 minutes/month)
- ❌ You need to ship features quickly
- ❌ You don't have DevOps experience on the team

---

## 🏰 Competitive Moats (Strategic Advantages)

**Going custom with OpenAI Realtime API creates several defensible competitive advantages:**

### 1. **Proprietary Fine-Tuning & Optimization** 🎯
- **Moat**: Fine-tune models specifically for **trades/booking conversations**
- **Competitive Advantage**: Your AI gets better at HVAC/plumbing/etc. than generic solutions
- **Implementation**: Collect successful call transcripts → Fine-tune GPT-4o Realtime
- **Barrier to Entry**: Competitors need your data + expertise to replicate

```typescript
// Example: Custom fine-tuning pipeline
async function fineTuneFromSuccessfulCalls() {
  // Collect high-quality booking calls (completed bookings, high customer satisfaction)
  const successfulCalls = await prisma.call.findMany({
    where: {
      status: 'completed',
      bookings: { some: { status: 'booked' } },
      voiceConfidence: { gte: 0.85 },
    },
    include: { transcript: true, bookings: true }
  })
  
  // Create training dataset
  // Fine-tune OpenAI model on your proprietary data
  // Result: AI optimized specifically for YOUR use case
}
```

### 2. **Industry-Specific Conversational Patterns** 💬
- **Moat**: Learn and optimize for **trade-specific conversation flows**
- **Examples**:
  - "AC not working" → Automatically detect HVAC vs. electrical
  - Emergency detection patterns (water leaks, gas smells, etc.)
  - Pricing upsell opportunities (premium vs. standard service)
- **Barrier**: Requires deep domain knowledge + call data

### 3. **Complete Integration Control** 🔗
- **Moat**: Deeply integrate with **your entire booking ecosystem**
- **Advantages**:
  - Real-time technician availability (not just calendar slots)
  - Smart routing based on location + skills + workload
  - Dynamic pricing based on demand/time/urgency
  - Seamless CRM integration (customer history, preferences)
- **Barrier**: Competitors using generic platforms can't match this depth

### 4. **Data Moat** 📊
- **Moat**: Proprietary dataset of successful booking conversations
- **Collection**: Every call improves your system
- **Usage**:
  - Train models on what works
  - Identify patterns (time of day, customer types, booking success rates)
  - Optimize prompts based on real data, not guesses
- **Barrier**: Takes months/years to build equivalent dataset

### 5. **Cost Advantage at Scale** 💰
- **Moat**: Lower costs → Can offer better pricing or higher margins
- **Math**:
  - Vapi: $0.40-0.60/minute
  - Custom: $0.18/minute + infrastructure
  - **Savings**: $0.22-0.42/minute
  - At 10,000 minutes/month: **$2,200-4,200/month savings**
- **Competitive Edge**: Can undercut competitors or reinvest in features

### 6. **Custom Features Competitors Can't Match** ⚡
- **Moat**: Build features that generic platforms don't support
- **Examples**:
  - **Smart dispatch**: "Route to nearest available tech with right skills"
  - **Predictive booking**: "Based on your area, we'll have someone there in 45 minutes"
  - **Upsell optimization**: "Would you like priority service? It's only $50 extra"
  - **Multi-trade routing**: "Sounds like electrical + plumbing. I'll book both teams"
- **Barrier**: Requires custom code, competitors using Vapi can't easily replicate

### 7. **Brand & Trust Moat** 🛡️
- **Moat**: Customers trust YOUR brand, not Vapi's infrastructure
- **Advantages**:
  - "AfterHourFix AI" is YOUR product, not white-labeled Vapi
  - Control over reliability, uptime, support
  - Build reputation: "AfterHourFix has the best booking AI"
- **Barrier**: Brand reputation takes time to build, hard to copy

### 8. **Network Effects** 🌐
- **Moat**: More customers → Better AI → More customers
- **How it works**:
  1. More calls → More training data
  2. Better AI → Better booking rates
  3. Better booking rates → More customers
  4. Repeat
- **Barrier**: First mover advantage compounds over time

### 9. **Vertical Integration** 🏗️
- **Moat**: Own the entire stack (telephony → AI → booking → dispatch)
- **Advantages**:
  - Optimize entire customer journey, not just AI piece
  - Capture more value (don't pay Vapi's margin)
  - Faster iteration (don't wait for Vapi to add features)
- **Barrier**: Requires technical expertise + development resources

---

## 🎯 Strategic Decision Framework

**Go Custom (Build Moat) If:**
- ✅ You have technical team to build/maintain
- ✅ You plan to scale significantly (10k+ minutes/month)
- ✅ You want to differentiate on AI quality/features
- ✅ You're building a **long-term defensible business**
- ✅ You can invest 3-5 weeks upfront

**Stay on Vapi (Focus on Product) If:**
- ❌ You want to focus on **business development, not infrastructure**
- ❌ You're early stage (<1000 minutes/month)
- ❌ You don't have DevOps/infrastructure expertise
- ❌ You need to **ship features fast** (not optimize infrastructure)
- ❌ You're testing product-market fit

---

## 💡 Hybrid Strategy: Build Moat Gradually

**Phase 1: Start on Vapi** (Months 1-3)
- Validate product-market fit
- Collect customer data
- Build booking/scheduling features

**Phase 2: Go Custom** (Months 4-6)
- Once you have:
  - Proven demand (1000+ minutes/month)
  - Clear ROI on custom build
  - Technical resources available
- Build custom OpenAI Realtime implementation
- Fine-tune on your proprietary call data

**Phase 3: Competitive Advantage** (Months 6+)
- Continuously improve AI with your data
- Add custom features competitors can't match
- Build brand: "Best AI booking system for trades"

---

## 📈 Moats Summary

| Moat | Difficulty | Time to Build | Defensibility |
|------|------------|---------------|---------------|
| **Proprietary Fine-Tuning** | Medium | 3-6 months | High |
| **Industry-Specific Patterns** | Medium | 6-12 months | High |
| **Integration Depth** | Low-Medium | 1-3 months | Medium |
| **Data Moat** | Low | Ongoing | Very High |
| **Cost Advantage** | Low | Immediate | Medium |
| **Custom Features** | Medium | Ongoing | High |
| **Brand/Trust** | Medium | 12+ months | Very High |
| **Network Effects** | Low | Ongoing | Very High |

**Bottom Line**: Custom implementation gives you **multiple compounding moats** that competitors using generic platforms can't easily replicate. Worth the investment if you're building a long-term business.

---

## 📚 Resources

- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/twiml/stream)
- [OpenAI Realtime SDK](https://github.com/openai/realtime-api-sdk)
- [OpenAI Fine-Tuning Guide](https://platform.openai.com/docs/guides/fine-tuning)
- [Vapi Migration Guide](https://docs.vapi.ai) (if staying on Vapi)
