# 🚀 OpenAI Realtime Server - Quick Start

## What We've Built (Day 1)

We've set up the foundation for the OpenAI Realtime API integration:

### ✅ Completed

1. **Server Infrastructure**
   - Express server with WebSocket support
   - Health check endpoint
   - Graceful shutdown handling

2. **Session Management**
   - `CallSessionManager` class to track active calls
   - Session lifecycle (create, active, ending, ended)
   - Connection tracking (Twilio WS ↔ OpenAI Realtime)

3. **Twilio Integration**
   - TwiML endpoints for incoming calls
   - Media Streams WebSocket handler
   - Status callback handling

4. **Realtime Agent Skeleton**
   - `RealtimeAgent` class structure
   - Placeholder for OpenAI Realtime API connection
   - Audio callback system ready

### 📁 Project Structure

```
server/
├── src/
│   ├── index.ts              # Main server (Express + WebSocket)
│   ├── session-manager.ts    # Tracks call sessions
│   ├── realtime-agent.ts     # OpenAI Realtime client (skeleton)
│   └── twilio/
│       ├── routes.ts         # TwiML endpoints
│       └── media-streams.ts  # Media Streams WebSocket
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

### 1. Install Server Dependencies

```bash
cd server
npm install
```

### 2. Set Environment Variables

Create `server/.env`:

```env
PORT=8080
OPENAI_API_KEY=sk-your-key-here
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
# Leave MEDIA_STREAM_URL unset for localhost testing (defaults to ws://localhost:8080/twilio/stream)
# MEDIA_STREAM_URL=ws://localhost:8080/twilio/stream
DATABASE_URL=postgresql://...
```

### 3. Run the Server

```bash
# Development (with auto-reload)
npm run server:dev

# Or from server directory
cd server
npm run dev
```

You should see:
```
🚀 AfterHourFix Realtime Server running on port 8080
📡 WebSocket server ready for connections
🔗 Health check: http://localhost:8080/health
```

### 4. Test Health Check

```bash
curl http://localhost:8080/health
```

## Next Steps (Day 2-5)

### Day 2: Complete Twilio Integration
- [ ] Look up agent/project by phone number
- [ ] Handle Twilio Media Streams audio format
- [ ] Test receiving audio chunks from Twilio

### Day 3: OpenAI Realtime API
- [ ] Implement WebSocket connection to OpenAI Realtime API
- [ ] Handle session creation
- [ ] Set up event listeners for audio/function calls

### Day 4: Audio Conversion
- [ ] Install audio libraries (mulaw, resampling)
- [ ] Convert Twilio μ-law 8kHz → OpenAI PCM 24kHz
- [ ] Convert OpenAI PCM 24kHz → Twilio μ-law 8kHz

### Day 5: Full Audio Pipeline
- [ ] Test bidirectional audio flow
- [ ] Measure latency
- [ ] **POC Complete!** 🎉

## Testing

Once Day 5 is complete, you'll be able to:

1. Make a call to your Twilio number
2. See audio flow: Twilio → Server → OpenAI → Server → Twilio
3. Hear AI responses in real-time

## Architecture Flow

```
Phone Call
    ↓
Twilio (PSTN)
    ↓
TwiML → /twilio/voice
    ↓
Media Streams WebSocket
    ↓
[Audio Converter] ← Day 4
    ↓
OpenAI Realtime API ← Day 3
    ↓
[Function Calls] ← Week 2
    ↓
Audio Response
    ↓
Media Streams WebSocket
    ↓
Twilio → Phone Call
```

## Troubleshooting

**Server won't start?**
- Check if port 8080 is available
- Verify all dependencies installed: `cd server && npm install`

**WebSocket errors?**
- For local testing: Leave `MEDIA_STREAM_URL` unset (defaults to `ws://localhost:8080/twilio/stream`)
- For production: Set `MEDIA_STREAM_URL=wss://your-domain.com/twilio/stream`
- Check Twilio account credentials

**Missing OpenAI API key?**
- Add `OPENAI_API_KEY` to `server/.env`
- Get key from: https://platform.openai.com/api-keys

## Resources

- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/twiml/stream)
- [Migration Guide](../OPENAI_REALTIME_MIGRATION.md)

---

**Status**: 🟡 Day 1 Complete - Foundation Built!

**Next**: Day 2 - Complete Twilio Media Streams integration
