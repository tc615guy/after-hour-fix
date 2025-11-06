# Smart Hangup & Conversation Management Features

## Overview
These features help save AI minutes and costs by automatically detecting and ending unproductive calls, while ensuring legitimate customers get fast service.

## Features Implemented

### 1. **Silence Detection & Auto-Hangup**
- **Threshold**: 15 seconds of no user response
- **Behavior**: Automatically hangs up if customer doesn't respond after 15 seconds
- **Tracking**: Monitors `lastUserMessageTime` and calculates silence duration
- **Reset**: Silence timer resets every time user speaks

### 2. **Conversation Progress Timeout**
- **Threshold**: 3 minutes with no booking progress
- **Behavior**: Hangs up if call hasn't progressed beyond getting name after 3 minutes
- **Progress Tracking**: Tracks booking progress stages:
  - `none` - No progress
  - `name` - Got customer name
  - `phone` - Got phone number
  - `address` - Got address (checked service area)
  - `slots` - Retrieved available slots
  - `booked` - Successfully booked appointment
- **Reset**: Timeout resets when booking progress advances

### 3. **AI-Powered Detection (System Prompt)**
The AI is instructed to detect and hang up on:

#### **Spam/Robocall Detection**
- Automated/robotic voices
- Telemarketing phrases: "press 1", "verify your account", "free trial"
- Response: "I'm sorry, this line is for service appointments only. Goodbye."

#### **Wrong Number Detection**
- Customer says: "wrong number", "I didn't call you", "who is this?"
- Customer asks for different business
- Response: "I'm sorry, you've reached [Business Name]. If you need [service type], I can help. Otherwise, goodbye."

#### **Jargon/Unintelligible Speech**
- Highly technical jargon that can't be understood
- Non-English language (after 1 clarification attempt)
- Garbled/unclear audio
- Response: "I'm having trouble understanding. Could you call back when you have a clearer connection? Goodbye."

#### **Silence/No Response**
- No response after question (wait 5 seconds, ask once more)
- If still no response: "I'm not hearing you. Please call back when ready. Goodbye."

#### **Non-Service Calls**
- Customer asking for directions, hours, general info (not booking)
- Response: "For general information, please visit our website or call during business hours. Goodbye."

### 4. **Hangup Protocol**
- Be polite but firm
- End unproductive calls within 30 seconds when detected
- Do NOT continue conversation after identifying spam/wrong number/jargon
- Only continue if customer clearly needs service and can communicate clearly

## Technical Implementation

### Session Tracking
```typescript
interface CallSession {
  lastUserMessageTime?: Date      // Last user speech
  lastActivityTime?: Date          // Last activity (user or AI)
  bookingProgress?: 'none' | 'name' | 'phone' | 'address' | 'slots' | 'booked'
  silenceDuration?: number         // Seconds of silence
  conversationTimeout?: NodeJS.Timeout
  silenceTimeout?: NodeJS.Timeout
  hangupReason?: string           // Reason for hanging up (for logging)
}
```

### Monitoring
- **Silence Check**: Runs every 5 seconds to calculate silence duration
- **Silence Timeout**: 15 seconds - auto-hangup if exceeded
- **Progress Timeout**: 3 minutes - auto-hangup if no progress

### Callbacks
- `onUserMessage()` - Called when user transcript is received (resets silence timer)
- `onBookingProgress()` - Called when booking function is executed (tracks progress)

## Benefits

1. **Cost Savings**: Prevents wasting minutes on spam, wrong numbers, and unproductive calls
2. **Better Service**: Legitimate customers get faster service (less queue time)
3. **Automatic**: No manual intervention needed
4. **Smart Detection**: AI can detect nuanced situations (jargon, spam, wrong numbers)
5. **Logging**: All hangups are logged with reason for analysis

## Configuration

### Timeouts (in `server/src/session-manager.ts`)
- **Silence Timeout**: 15 seconds (line 695)
- **Conversation Timeout**: 3 minutes (line 727)
- **Silence Check Interval**: 5 seconds (line 661)

### System Prompt (in `server/src/realtime-agent.ts`)
- Detection instructions are in the `buildSystemPrompt()` method
- Can be customized per project via `aiSettings`

## Future Enhancements

1. **Configurable Timeouts**: Allow per-project timeout configuration
2. **Hangup Analytics**: Dashboard showing hangup reasons and patterns
3. **Whitelist**: Allow certain numbers to bypass auto-hangup
4. **Language Support**: Multi-language detection and routing
5. **Spam Number Database**: Block known spam numbers automatically

