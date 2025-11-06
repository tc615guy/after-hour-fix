# AI Learning System 🧠

## Overview

AfterHourFix now includes an automatic AI learning system that analyzes every call and continuously improves your AI assistant. This creates a powerful competitive moat—your AI gets smarter with every conversation.

## How It Works

### 1. **Call Analysis** 📊
Every completed call is automatically analyzed to extract:
- Customer questions and issues
- Conversation patterns
- Booking success indicators
- Emergency detection patterns
- Key phrases and topics

### 2. **Knowledge Gap Detection** 🔍
The system identifies:
- Questions asked repeatedly by customers
- Questions the AI struggled to answer well
- Topics that need better documentation
- Missing information in your knowledge base

### 3. **Auto-FAQ Generation** ✨
When customers ask the same question 3+ times:
- The system extracts the question
- Finds the AI's most common/successful answer
- Generates a suggested FAQ entry
- You review and approve (one click to add)

### 4. **Prompt Optimization** 🎯
Analyzes successful booking calls to suggest:
- Better greeting phrases
- More efficient booking flows
- Improved emergency detection
- Optimized conversation patterns

### 5. **Customer Feedback** ⭐
After successful bookings:
- Automatic SMS sent to customer
- Simple 1-5 star rating + optional comment
- Feedback used to weight call quality
- High-rated calls prioritized for learning

### 6. **Fine-Tuning Export** 🚀
Export high-quality calls for OpenAI fine-tuning:
- Filters for successful bookings (4+ star ratings)
- Exports in OpenAI JSONL format
- Creates custom model trained on YOUR data
- Competitive advantage: Only you have this data

---

## Features

### ✅ Implemented

| Feature | Description | Status |
|---------|-------------|--------|
| Call Intelligence Service | Analyzes transcripts for patterns | ✅ Complete |
| Knowledge Gap Detection | Identifies unanswered questions | ✅ Complete |
| Auto-FAQ Generation | Creates FAQ entries from patterns | ✅ Complete |
| Prompt Suggestions | Recommends system prompt improvements | ✅ Complete |
| API Endpoints | Access insights via REST API | ✅ Complete |
| Dashboard UI | Review and approve suggestions | ✅ Complete |
| Background Analysis | Periodic automated analysis | ✅ Complete |
| Customer Feedback | SMS surveys after calls | ✅ Complete |
| Fine-Tuning Export | Export data for OpenAI training | ✅ Complete |

---

## Using the System

### Access AI Insights Dashboard

1. Navigate to: `/dashboard/ai-insights?projectId=YOUR_PROJECT_ID`
2. View three tabs:
   - **Knowledge Gaps**: Questions needing better answers
   - **Prompt Suggestions**: System prompt improvements
   - **Auto-FAQs**: Ready-to-add FAQ entries

### Review Knowledge Gaps

Knowledge gaps show questions customers ask frequently:

```typescript
{
  question: "What's your warranty period?",
  frequency: 5, // Asked 5 times
  wasAnswered: false, // AI struggled to answer
  relatedCalls: ["call123", "call456", ...],
}
```

**Action**: Click "Add to Knowledge Base" → Update your FAQ/knowledge base

### Accept Auto-FAQs

Auto-generated FAQs are ready to approve:

```typescript
{
  question: "Do you charge a trip fee?",
  suggestedAnswer: "Yes, we charge a $89 trip fee...",
  confidence: 0.85, // 85% confidence
}
```

**Action**: Click "✓ Add to Knowledge Base" → Instantly synced to your AI

### Review Prompt Suggestions

Based on successful calls:

```typescript
{
  type: "booking_flow",
  suggestedText: "Get name, phone, and address in first 60 seconds",
  reason: "12 fast bookings completed in <3 mins",
  confidence: 0.9,
  basedOnCalls: 12,
}
```

**Action**: Update your AI settings or system prompt

### Customer Feedback

After successful bookings, customers receive:
```
Thanks for calling [Your Company]! How was your experience? Rate us: [link]
```

Feedback improves call quality scoring and prioritization.

---

## API Endpoints

### GET `/api/ai-insights/knowledge-gaps`
Get identified knowledge gaps
```typescript
GET /api/ai-insights/knowledge-gaps?projectId=xxx&limit=100&daysBack=30

Response:
{
  success: true,
  gaps: [
    {
      question: "...",
      frequency: 5,
      wasAnswered: false,
      relatedCalls: ["id1", "id2"],
    }
  ],
  summary: {
    total: 15,
    unanswered: 8,
    frequent: 5,
  }
}
```

### GET `/api/ai-insights/prompt-suggestions`
Get prompt optimization suggestions
```typescript
GET /api/ai-insights/prompt-suggestions?projectId=xxx&minCalls=10

Response:
{
  success: true,
  suggestions: [
    {
      type: "greeting",
      suggestedText: "...",
      reason: "...",
      confidence: 0.85,
      basedOnCalls: 15,
    }
  ]
}
```

### GET `/api/ai-insights/auto-faqs`
Get auto-generated FAQ suggestions
```typescript
GET /api/ai-insights/auto-faqs?projectId=xxx

Response:
{
  success: true,
  faqs: [
    {
      question: "...",
      suggestedAnswer: "...",
      confidence: 0.9,
    }
  ]
}
```

### POST `/api/ai-insights/auto-faqs`
Accept and save an auto-generated FAQ
```typescript
POST /api/ai-insights/auto-faqs
{
  projectId: "xxx",
  question: "...",
  answer: "...",
}

Response:
{
  success: true,
  message: "FAQ added and synced to AI",
  totalFAQs: 25,
}
```

### POST `/api/ai-insights/analyze`
Trigger manual analysis
```typescript
POST /api/ai-insights/analyze
{
  projectId: "xxx",
}

Response:
{
  success: true,
  result: {
    analyzedCalls: 50,
    insights: {
      knowledgeGaps: 8,
      suggestions: 3,
      autoFAQs: 5,
    }
  }
}
```

### GET `/api/ai-insights/export-finetuning`
Export fine-tuning data statistics
```typescript
GET /api/ai-insights/export-finetuning?projectId=xxx

Response:
{
  success: true,
  stats: {
    totalCalls: 200,
    highQualityCalls: 50,
    estimatedExamples: 50,
    readyForFineTuning: true, // Need 50+ examples
  }
}
```

### POST `/api/ai-insights/export-finetuning`
Export fine-tuning data (JSONL format)
```typescript
POST /api/ai-insights/export-finetuning
{
  projectId: "xxx",
}

Response:
{
  success: true,
  examples: [
    {
      messages: [
        { role: "system", content: "..." },
        { role: "user", content: "..." },
        { role: "assistant", content: "..." },
      ]
    }
  ],
  count: 50,
}
```

---

## Background Analysis

The system runs periodic analysis automatically:

```typescript
// Runs every 24 hours by default
// Analyzes recent calls for all active projects
// Generates insights and stores in database
```

### Manual Trigger
```bash
# Trigger analysis for specific project
POST /api/ai-insights/analyze
{ "projectId": "xxx" }

# Trigger global analysis (admin only)
POST /api/ai-insights/analyze
{ "global": true }
```

---

## Fine-Tuning Your AI

Once you have 50+ high-quality calls:

1. **Export Training Data**
   ```bash
   POST /api/ai-insights/export-finetuning
   { "projectId": "xxx" }
   ```

2. **Upload to OpenAI**
   ```bash
   openai api fine_tunes.create \
     -t training_data.jsonl \
     -m gpt-4o-realtime-preview-2024-12-17
   ```

3. **Update Your Agent**
   - Use the fine-tuned model ID
   - Your AI is now trained on YOUR best calls
   - Competitive advantage: No one else has this data

---

## Competitive Moat

This AI learning system creates an unbeatable advantage:

### 1. **Data Moat** 📊
- Every call adds to your proprietary dataset
- Competitors can't replicate your data
- Months/years to build equivalent dataset

### 2. **Domain Expertise** 🔧
- AI learns trade-specific patterns (plumbing, HVAC, electrical)
- Understands emergency vs. routine calls
- Optimized for after-hours service

### 3. **Continuous Improvement** 📈
- AI gets better automatically
- No manual tuning required
- Compounds over time

### 4. **Custom Fine-Tuning** 🎯
- Train on YOUR successful calls
- Model optimized for YOUR business
- No generic AI can match this

### 5. **Customer Feedback Loop** ⭐
- Direct customer ratings
- Validates what works
- Prioritizes high-quality patterns

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Customer Call                      │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│            OpenAI Realtime Agent                     │
│         (Transcript + Metrics Tracked)               │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│              Call Record Stored                      │
│     (Transcript, Duration, Confidence, etc.)         │
└───────────────────┬─────────────────────────────────┘
                    │
                    ├──► Customer Feedback SMS Sent
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│          Background Analysis (Every 24hrs)           │
│   • Analyze transcripts                              │
│   • Detect patterns                                  │
│   • Generate suggestions                             │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│              AI Insights Dashboard                   │
│   • Knowledge Gaps                                   │
│   • Prompt Suggestions                               │
│   • Auto-FAQs                                        │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│         Business Owner Reviews & Approves            │
│   • Click to add FAQ                                 │
│   • Update knowledge base                            │
│   • Refine prompts                                   │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│        Changes Synced to AI in Real-Time             │
│   • Updated prompts                                  │
│   • New FAQs                                         │
│   • Improved responses                               │
└─────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Make Some Calls**: The system needs data to learn from
2. **Wait 24 Hours**: Background analysis runs automatically
3. **Review Insights**: Check `/dashboard/ai-insights`
4. **Approve Suggestions**: One-click to add FAQs
5. **Export for Fine-Tuning**: Once you have 50+ quality calls

---

## Files Created

### Core Intelligence
- `src/lib/ai-learning/call-intelligence.ts` - Analysis and pattern detection
- `src/lib/ai-learning/background-analysis.ts` - Periodic analysis jobs
- `src/lib/ai-learning/customer-feedback.ts` - SMS feedback collection
- `src/lib/ai-learning/fine-tuning-export.ts` - OpenAI training data export

### API Endpoints
- `src/app/api/ai-insights/knowledge-gaps/route.ts`
- `src/app/api/ai-insights/prompt-suggestions/route.ts`
- `src/app/api/ai-insights/auto-faqs/route.ts`
- `src/app/api/ai-insights/analyze/route.ts`
- `src/app/api/ai-insights/export-finetuning/route.ts`
- `src/app/api/feedback/route.ts`

### UI
- `src/app/dashboard/ai-insights/page.tsx` - Dashboard
- `src/app/feedback/[token]/page.tsx` - Customer feedback form

### Integration
- `server/src/session-manager.ts` - Integrated feedback SMS sending

---

## Performance Impact

- **Zero latency impact**: Analysis runs asynchronously after calls
- **Minimal database load**: Periodic analysis, not real-time
- **SMS cost**: ~$0.01 per feedback request (optional)
- **Storage**: Transcripts already stored, no additional cost

---

## Privacy & Security

- Customer phone numbers never exposed
- Transcripts stored securely
- Feedback tokens expire after 7 days
- All data encrypted at rest
- GDPR/CCPA compliant (deletion supported)

---

## Support

Questions? Check the dashboard or review call transcripts to see the system in action.

The more calls you receive, the smarter your AI becomes! 🚀

