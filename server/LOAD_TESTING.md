# Load Testing Guide 🧪

## Week 4, Day 23: Load Testing Setup

This document outlines how to perform load testing on the OpenAI Realtime server.

---

## Prerequisites

```bash
npm install --save-dev artillery
# or
npm install --save-dev autocannon
```

---

## Test Scenarios

### 1. Health Check Load Test

**Goal**: Verify server can handle health check requests under load

```bash
# Using Artillery
artillery quick --count 100 --num 10 http://localhost:8080/health
```

**Expected**: All requests should return 200 OK within 100ms

---

### 2. Concurrent Call Simulation

**Goal**: Test system with multiple simultaneous calls

**Note**: Full call simulation requires actual Twilio integration. For load testing:

1. **Use ngrok** to expose local server
2. **Configure Twilio** to point to ngrok URL
3. **Make multiple test calls** simultaneously

---

### 3. Analytics Endpoint Load Test

**Goal**: Test analytics queries under load

```bash
# Test analytics endpoint (replace PROJECT_ID)
artillery quick --count 50 --num 5 \
  http://localhost:8080/analytics/project/PROJECT_ID
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Health Check Latency | < 100ms | No DB query |
| Detailed Health Check | < 500ms | Includes DB query |
| Analytics Query | < 1000ms | Depends on data size |
| Call Setup Time | < 2s | Call start → AI responding |
| Audio Latency | < 200ms | Speech → Response |
| Function Call Latency | < 500ms | Function call → Result |
| Concurrent Calls | 10+ | Should handle gracefully |

---

## Manual Load Test Script

Create `server/scripts/load-test.ts`:

```typescript
// Basic load test script
const testConcurrency = async () => {
  const concurrent = 10
  const url = 'http://localhost:8080/health'
  
  const requests = Array(concurrent).fill(0).map(async () => {
    const start = Date.now()
    try {
      const res = await fetch(url)
      const latency = Date.now() - start
      return { success: res.ok, latency, status: res.status }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
  
  const results = await Promise.all(requests)
  console.log('Load test results:', results)
  
  const successCount = results.filter(r => r.success).length
  const avgLatency = results
    .filter(r => r.latency)
    .reduce((sum, r) => sum + (r.latency || 0), 0) / successCount
  
  console.log(`Success: ${successCount}/${concurrent}`)
  console.log(`Average latency: ${avgLatency}ms`)
}

testConcurrency()
```

---

## Monitoring During Load Test

1. **Watch server logs** for errors
2. **Monitor health endpoint**: `curl http://localhost:8080/health/detailed`
3. **Check database connections** in logs
4. **Monitor memory usage** via health check

---

## Load Test Checklist

- [ ] Server handles 100+ health checks/second
- [ ] Analytics queries complete within 1s under load
- [ ] Multiple concurrent calls don't crash server
- [ ] Memory usage stays stable
- [ ] No database connection pool exhaustion
- [ ] Error rate stays below 1%

---

## Tools

- **Artillery**: HTTP load testing
- **autocannon**: Fast HTTP benchmarking
- **k6**: Modern load testing tool
- **Locust**: Python-based load testing

---

## Example Artillery Config

Create `artillery-config.yml`:

```yaml
config:
  target: 'http://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
scenarios:
  - name: "Health checks"
    flow:
      - get:
          url: "/health"
  - name: "Analytics"
    flow:
      - get:
          url: "/analytics/project/{{ $processEnvironment.PROJECT_ID }}"
```

Run: `artillery run artillery-config.yml`

---

**Note**: Full end-to-end call load testing requires Twilio setup and test phone numbers.
