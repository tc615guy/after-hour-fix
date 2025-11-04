# API Documentation 📚

## Week 4, Day 24: API Reference

Complete API documentation for the OpenAI Realtime server.

---

## Base URL

```
http://localhost:8080  # Development
https://your-domain.com  # Production
```

---

## Health Endpoints

### GET /health

Quick health check for load balancers.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 3600,
  "activeSessions": 3
}
```

---

### GET /health/detailed

Comprehensive health check with service status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "services": {
    "database": {
      "status": "up",
      "latency": 12
    },
    "openai": {
      "status": "up"
    },
    "twilio": {
      "status": "configured"
    },
    "server": {
      "status": "up",
      "uptime": 3600,
      "activeSessions": 3,
      "memoryUsage": {
        "rss": 123456789,
        "heapTotal": 98765432,
        "heapUsed": 45678901,
        "external": 1234567
      }
    }
  }
}
```

**Status Codes:**
- `200` - Healthy or Degraded
- `503` - Unhealthy

---

## Twilio Endpoints

### POST /twilio/voice

TwiML endpoint for incoming calls. Called by Twilio when a call comes in.

**Request Body** (from Twilio):
```
CallSid=CA...
From=+1234567890
To=+1987654321
```

**Response:** TwiML XML
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="wss://your-domain.com/twilio/stream?callSid=CA..." />
  </Start>
  <Say>Connecting you now.</Say>
</Response>
```

---

### POST /twilio/status

Status callback endpoint. Called by Twilio when call status changes.

**Request Body:**
```
CallSid=CA...
CallStatus=completed|no-answer|busy|failed
From=+1234567890
To=+1987654321
```

**Response:** `200 OK`

---

### WebSocket: /twilio/stream

Media Streams WebSocket connection. Receives audio from Twilio and sends audio back.

**Query Parameters:**
- `callSid` - Twilio Call SID

**Messages (from Twilio):**
```json
{
  "event": "start",
  "streamSid": "MZ...",
  "accountSid": "AC...",
  "callSid": "CA...",
  "tracks": ["inbound", "outbound"]
}
```

```json
{
  "event": "media",
  "streamSid": "MZ...",
  "media": {
    "track": "inbound",
    "chunk": "1",
    "timestamp": "12345",
    "payload": "base64-encoded-audio"
  }
}
```

**Messages (to Twilio):**
```json
{
  "event": "media",
  "streamSid": "MZ...",
  "media": {
    "payload": "base64-encoded-ulaw-audio"
  }
}
```

---

## Analytics Endpoints

### GET /analytics/project/:projectId

Get comprehensive analytics for a project.

**Query Parameters:**
- `startDate` (optional) - ISO 8601 date string
- `endDate` (optional) - ISO 8601 date string

**Default:** Last 30 days

**Response:**
```json
{
  "projectId": "proj_123",
  "projectName": "Demo Plumbing",
  "dateRange": {
    "start": "2024-12-15T00:00:00Z",
    "end": "2025-01-15T00:00:00Z"
  },
  "totalCalls": 150,
  "completedCalls": 120,
  "missedCalls": 20,
  "failedCalls": 10,
  "averageDuration": 180,
  "totalDuration": 21600,
  "totalFunctionCalls": 350,
  "errorRate": 2.5,
  "callsByStatus": {
    "completed": 120,
    "missed": 20,
    "failed": 10,
    "active": 0
  },
  "callsByIntent": {
    "emergency": 45,
    "routine": 95,
    "unknown": 10
  }
}
```

---

### GET /analytics/project/:projectId/recent

Get recent calls for a project.

**Query Parameters:**
- `limit` (optional) - Number of calls to return (default: 10, max: 100)

**Response:**
```json
{
  "calls": [
    {
      "id": "call_123",
      "callSid": "CA...",
      "status": "completed",
      "durationSec": 180,
      "intent": "emergency",
      "fromNumber": "+1234567890",
      "createdAt": "2025-01-15T10:30:00Z",
      "transcriptPreview": "Customer called about a burst pipe..."
    }
  ]
}
```

---

### GET /analytics/project/:projectId/statistics

Get call statistics for a date range.

**Query Parameters:**
- `startDate` (required) - ISO 8601 date string
- `endDate` (required) - ISO 8601 date string

**Response:**
```json
{
  "totalCalls": 150,
  "completedCalls": 120,
  "averageCallDuration": 180,
  "totalMinutes": 360,
  "callsByDay": [
    { "date": "2025-01-15", "count": 10 },
    { "date": "2025-01-16", "count": 12 }
  ]
}
```

**Status Codes:**
- `400` - Missing or invalid date parameters
- `200` - Success

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message here"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (for health checks)

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding for production:
- Health checks: 100 req/s
- Analytics: 10 req/s
- Twilio endpoints: No limit (Twilio controls)

---

## Authentication

Currently no authentication on server endpoints. In production, consider:
- API key authentication for analytics endpoints
- Webhook signature validation for Twilio endpoints
- IP allowlisting for Twilio webhooks

---

**API documentation complete!** 📚
