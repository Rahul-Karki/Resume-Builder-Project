# AI Integration Architecture Blueprint

## Current State Assessment
✅ **Already Implemented:**
- Backend AI endpoints: `/api/ai/improve-text`, `/api/ai/check-grammar`, `/api/ai/enhance-bullet`
- AI providers: OpenAI & Gemini with smart fallback to deterministic suggestions
- Rate limiting: Redis-based AI rate limiter per user
- BullMQ infrastructure: ATS analysis queue with worker processors
- Observability: OpenTelemetry tracing, Prometheus metrics, Pino structured logging
- Frontend: AIAssistantPanel component with field-focused editor tracking
- Error handling: Basic try-catch with logging, deterministic fallbacks

⚠️ **Gaps to Address:**
- Real-time suggestion rendering optimization (debouncing, memoization, request cancellation)
- Comprehensive AI request observability (request ID, token usage, latency tracking)
- Worker crash monitoring and retry handling
- Queue backlog and job failure tracking
- Graceful degradation when AI services are unavailable
- Frontend error boundaries for AI component failures
- Structured input validation and AI response sanitization
- Request cancellation for in-flight AI requests
- Optimistic UI updates for better perceived performance
- Non-blocking suggestion rendering

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React + Zustand)                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐        ┌──────────────────────┐       │
│  │ Editor Field Focus   │        │ AI Assistant Panel   │       │
│  │ - Track active field │───────▶│ - Real-time suggest. │       │
│  │ - Section context    │        │ - Debounced requests │       │
│  │ - User selections    │        │ - Cancel old requests │       │
│  └──────────────────────┘        └──────────────────────┘       │
│                                            │                     │
│  ┌──────────────────────┐                  │                     │
│  │ Autosave & Form      │                  ▼                     │
│  │ - Non-blocking save  │        ┌──────────────────────┐       │
│  │ - Batch updates      │        │ Request Manager      │       │
│  │ - Debounced persist  │        │ - Dedup requests     │       │
│  └──────────────────────┘        │ - Track in-flight    │       │
│                                  │ - Emit request IDs   │       │
│                                  └──────────────────────┘       │
│                                            │                     │
└────────────────────────────────────────────┼─────────────────────┘
                                             │
                    ┌────────────────────────┴──────────────────┐
                    │                                           │
        ┌───────────▼──────────┐                   ┌───────────▼──────────┐
        │ Real-time AI Requests│                   │ Async ATS Analysis   │
        │ /api/ai/*            │                   │ BullMQ Queue         │
        │ - Low latency        │                   │                      │
        │ - Direct response    │                   │ - Resume parsing     │
        │ - Token tracking     │                   │ - Job matching       │
        │ - Request logging    │                   │ - Grammar check      │
        └───────────┬──────────┘                   └───────────┬──────────┘
                    │                                           │
        ┌───────────▼──────────────────────────────────────────▼──────────┐
        │                    BACKEND (Node.js + Express)                  │
        ├─────────────────────────────────────────────────────────────────┤
        │                                                                  │
        │  ┌──────────────────────┐      ┌──────────────────────┐        │
        │  │ AI Service           │      │ ATS Analysis Service │        │
        │  │ - Text improvement   │      │ - Keyword matching   │        │
        │  │ - Grammar checking   │      │ - Grammar scoring    │        │
        │  │ - Bullet enhancement │      │ - Format checking    │        │
        │  └──────────────────────┘      │ - Overall scoring    │        │
        │         │                      └──────────────────────┘        │
        │         │                              │                       │
        │         ▼                              ▼                       │
        │  ┌──────────────────────────────────────────────┐             │
        │  │ Structured AI Calling Layer                  │             │
        │  │ - Provider selection (OpenAI/Gemini)         │             │
        │  │ - JSON schema enforcement                    │             │
        │  │ - Timeout & abort handling                   │             │
        │  │ - Fallback suggestion generation             │             │
        │  │ - Token counting & usage tracking            │             │
        │  │ - Request/Response validation                │             │
        │  │ - Error categorization & retry logic         │             │
        │  └──────────────────────────────────────────────┘             │
        │         │                           │                        │
        └─────────┼───────────────────────────┼────────────────────────┘
                  │                           │
        ┌─────────▼───────────────────────────▼──────────┐
        │        EXTERNAL AI PROVIDERS                    │
        ├──────────────────────────────────────────────────┤
        │  ┌──────────────────┐    ┌──────────────────┐  │
        │  │ OpenAI API       │    │ Google Gemini    │  │
        │  │ - gpt-4o-mini    │    │ - gemini-2.0-    │  │
        │  │ - JSON mode      │    │   flash          │  │
        │  │ - Token counting │    │ - JSON response  │  │
        │  └──────────────────┘    └──────────────────┘  │
        └──────────────────────────────────────────────────┘
        
        ┌──────────────────────────────────────────────────┐
        │        QUEUE & WORKER INFRASTRUCTURE             │
        ├──────────────────────────────────────────────────┤
        │  ┌──────────────────┐    ┌──────────────────┐  │
        │  │ BullMQ Queues    │    │ Redis Store      │  │
        │  │ - ATS Analysis   │    │ - Job state      │  │
        │  │ - Resume Process │    │ - Rate limiting  │  │
        │  │ - PDF Generation │    │ - Session cache  │  │
        │  └──────────────────┘    └──────────────────┘  │
        │         │                       ▲               │
        │         │                       │               │
        │         ▼                       │               │
        │  ┌──────────────────────────────┴────────────┐  │
        │  │ Worker Processors                        │  │
        │  │ - ATS scoring                            │  │
        │  │ - Grammar analysis                       │  │
        │  │ - Job description matching               │  │
        │  │ - Resume PDF generation                  │  │
        │  └─────────────────────────────────────────┘  │
        └──────────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────────┐
        │   OBSERVABILITY & MONITORING STACK              │
        ├──────────────────────────────────────────────────┤
        │  ┌────────────────────────────────────────────┐ │
        │  │ Structured Logging (Pino)                  │ │
        │  │ - AI request context                       │ │
        │  │ - Provider & model information             │ │
        │  │ - Token usage & cost tracking              │ │
        │  │ - Error categorization                     │ │
        │  │ - Request/response samples                 │ │
        │  └────────────────────────────────────────────┘ │
        │                     ▼                           │
        │  ┌────────────────────────────────────────────┐ │
        │  │ OpenTelemetry Tracing                      │ │
        │  │ - Request/response spans                   │ │
        │  │ - Provider latency tracking                │ │
        │  │ - Distributed trace context                │ │
        │  │ - Error attribution                        │ │
        │  └────────────────────────────────────────────┘ │
        │                     ▼                           │
        │  ┌────────────────────────────────────────────┐ │
        │  │ Prometheus Metrics                         │ │
        │  │ - AI request counters (by type, status)    │ │
        │  │ - Latency histograms                       │ │
        │  │ - Token usage gauges                       │ │
        │  │ - Provider success rates                   │ │
        │  │ - Queue depth & job counts                 │ │
        │  │ - Worker crash metrics                     │ │
        │  └────────────────────────────────────────────┘ │
        │                     ▼                           │
        │  ┌────────────────────────────────────────────┐ │
        │  │ Alerting (Grafana/PagerDuty)               │ │
        │  │ - AI latency > 3s alert                    │ │
        │  │ - Provider failure rate > 5% alert         │ │
        │  │ - Worker crashes alert                     │ │
        │  │ - Queue backlog > 100 jobs alert           │ │
        │  │ - Redis connection failures alert          │ │
        │  │ - Token usage spike alert                  │ │
        │  └────────────────────────────────────────────┘ │
        └──────────────────────────────────────────────────┘
```

---

## Key Design Principles

### 1. **Seamless Integration**
- AI endpoints use same authentication as existing API
- Leverage existing error handling patterns
- Integrate with current autosave flow (non-blocking)
- Preserve component hierarchy and Zustand store
- No breaking changes to API contracts

### 2. **Performance & Responsiveness**
- Debounced AI requests (500ms default)
- Request deduplication (prevent duplicate calls)
- Cancel in-flight requests on field changes
- Optimistic UI updates (show suggestion immediately)
- Non-blocking suggestion rendering (separate context)
- Lazy load AI panel (only when focused on editable field)

### 3. **Graceful Degradation**
- Deterministic fallback suggestions always available
- AI service downtime doesn't break editor
- Partial response handling (corrupted JSON)
- Timeout handling (3s default)
- Provider fallback (OpenAI → Gemini)
- Malformed response detection and sanitization

### 4. **Production Reliability**
- Request ID tracking (trace all AI interactions)
- Comprehensive error categorization
- Retry logic with exponential backoff
- Structured logging with context
- Token usage monitoring (cost control)
- Worker crash detection and recovery
- Queue job failure tracking

### 5. **Extensibility**
- Provider abstraction layer (easy to add Claude, Anthropic, etc.)
- Streaming response support (ready for real-time)
- Voice AI hooks (for future voice input)
- Custom prompt templates
- Advanced ATS models (pluggable processors)
- Analytics dashboards (metrics infrastructure)

---

## Detailed Components

### Frontend: Real-Time AI Suggestions

**Key Files:**
- `frontend/src/components/builder/AIAssistantPanel.tsx` (existing, needs optimization)
- `frontend/src/hooks/useAISuggestions.ts` (NEW - debounced requests)
- `frontend/src/hooks/useRequestManager.ts` (NEW - dedup & cancellation)
- `frontend/src/services/aiClient.ts` (NEW - request lifecycle)

**Flow:**
```
User types in editor
    │
    ▼
Field focus state updated (store)
    │
    ▼
useAISuggestions hook triggered (with 500ms debounce)
    │
    ▼
Check if request already in-flight (dedup)
    │
    ├─ YES: Skip request
    │
    └─ NO: Create AbortController, emit requestId
            │
            ▼
        Fetch /api/ai/improve-text (with timeout)
            │
            ├─ Success: Parse response, check validity
            │   │
            │   ▼
            │ Render suggestions (non-blocking)
            │
            ├─ Error: Log error, show fallback suggestions
            │
            └─ Timeout/Abort: Retry with exponential backoff
```

**Implementation Details:**
- Request Manager tracks `Map<requestKey, AbortController>`
- Debounce by request type + field ID
- Cancel previous request when new one issued
- Emit unique requestId for tracing
- Frontend sends `X-Request-ID` header
- Graceful handling of partial responses

---

### Backend: AI Service Enhancement

**Current:**
- `Backend/src/services/aiService.ts` (improveText, checkGrammar, enhanceBullet)
- `Backend/src/controllers/aiController.ts` (route handlers)

**To Enhance:**
1. **Request Validation & Sanitization:**
   - Input length limits (text ≤ 2500 chars)
   - Reject malicious patterns
   - Section enum validation

2. **AI Provider Abstraction:**
   ```typescript
   interface AiProvider {
     generateStructured<T>(
       systemPrompt: string,
       userPrompt: string,
       fallback: T,
       options: { timeout?: number; retries?: number }
     ): Promise<{ result: T; tokens: TokenUsage }>;
   }
   ```

3. **Response Validation:**
   - JSON schema validation
   - Required field checks
   - Type coercion with fallback
   - Hallucination detection (suggestions > 5? probably bad)

4. **Token Tracking:**
   - Count input/output tokens per request
   - Track cumulative usage per user/day
   - Alert on token limit approach (80% threshold)
   - Include token info in logs

5. **Error Categorization:**
   - `PROVIDER_ERROR` (OpenAI/Gemini API issue)
   - `TIMEOUT_ERROR` (exceeded 3s)
   - `RATE_LIMIT_ERROR` (user or API limit)
   - `VALIDATION_ERROR` (bad input)
   - `MALFORMED_RESPONSE` (invalid JSON)

6. **Structured Logging:**
   ```typescript
   logger.info({
     requestId: req.headers['x-request-id'],
     userId: req.user.id,
     aiType: 'improve-text',
     provider: 'gemini',
     tokens: { input: 150, output: 200 },
     latency_ms: 1234,
     status: 'success',
     section: 'experience'
   }, 'AI request completed');
   ```

---

### Worker: ATS Analysis & Async Processing

**Current:**
- `worker/src/processors/ats.processor.ts`
- `worker/src/processors/grammarAnalysis.processor.ts`
- `worker/src/processors/jdMatch.processor.ts`

**To Enhance:**
1. **Job Tracking:**
   - Persist job start time in Redis
   - Track job history (succeed/fail counts)
   - Monitor stalled jobs (> 30min without progress)

2. **Crash Detection:**
   ```typescript
   process.on('uncaughtException', (error) => {
     logger.error({ error, jobId }, 'Worker crashed');
     metrics.workerCrashes.inc({ reason: 'uncaught' });
     // Notify monitoring system
   });
   ```

3. **Job Failure Handling:**
   - Categorize failures (timeout, out-of-memory, etc.)
   - Store failure context for debugging
   - Implement exponential backoff retries
   - Alert after 3+ consecutive failures

4. **Observability:**
   - Track queue depth (backlog)
   - Monitor job processing time per type
   - Track retry rates
   - Alert on queue lag (> 5min old jobs)

---

### Observability: Comprehensive Monitoring

**Metrics to Track:**

1. **AI Request Metrics:**
   - `ai_requests_total` - Counter by type/status/provider
   - `ai_request_duration_seconds` - Histogram by provider
   - `ai_tokens_used_total` - Counter by model
   - `ai_fallback_rate` - Gauge (% using fallback)
   - `ai_validation_errors_total` - Counter by error type

2. **Provider Performance:**
   - `ai_provider_latency_seconds` - By provider
   - `ai_provider_errors_total` - By error type
   - `ai_provider_success_rate` - % successful

3. **Queue & Worker Metrics:**
   - `queue_depth` - Current job count by queue
   - `queue_jobs_processed_total` - Counter
   - `queue_job_duration_seconds` - Histogram
   - `queue_job_failures_total` - Counter by failure type
   - `worker_crashes_total` - Counter by reason
   - `worker_stalled_jobs` - Gauge

4. **System Health:**
   - `redis_connection_errors` - Counter
   - `ai_token_budget_remaining` - Gauge
   - `ai_provider_quota_used_percent` - Gauge

**Dashboard Sections:**
- **AI Performance**: Latency, success rate, token usage
- **Provider Health**: OpenAI vs Gemini comparison
- **Worker Status**: Queue depth, processing time, failures
- **Error Rates**: By type and category
- **Cost Tracking**: Token usage and estimated spend

**Alerting Rules:**
```
- AI latency > 3s for > 10% of requests → PAGE
- Provider error rate > 5% → PAGE
- Worker crash detected → PAGE
- Queue depth > 1000 jobs → WARN
- Redis unavailable → PAGE
- Token usage > 80% daily limit → WARN
```

---

## Implementation Phases

### Phase 1: Real-Time AI Optimization (Current)
- [ ] Add request debouncing & deduplication
- [ ] Implement request cancellation
- [ ] Add optimistic UI updates
- [ ] Enhance frontend error boundaries
- [ ] Token counting in responses

### Phase 2: Production Hardening (Next)
- [ ] Response validation & sanitization
- [ ] Comprehensive error categorization
- [ ] Retry logic with exponential backoff
- [ ] Timeout handling improvements
- [ ] Request ID tracing

### Phase 3: Observability (After Phase 2)
- [ ] Token usage tracking per request
- [ ] Queue job monitoring metrics
- [ ] Worker crash detection
- [ ] Structured logging enhancements
- [ ] Grafana dashboard setup

### Phase 4: Extensibility & Future (Final)
- [ ] Provider abstraction layer
- [ ] Support for Claude/Anthropic
- [ ] Streaming response support
- [ ] Advanced ATS models
- [ ] Analytics dashboard
- [ ] Voice AI integration hooks

---

## File Structure After Implementation

```
Backend/
  src/
    services/
      aiService.ts (enhanced with validation, tokens)
      aiProviders.ts (NEW - abstraction layer)
      aiTokenCounter.ts (NEW - token counting)
    controllers/
      aiController.ts (enhanced with logging)
    middleware/
      aiValidation.ts (NEW - request validation)
      aiErrorHandler.ts (NEW - error categorization)
    observability/
      aiMetrics.ts (NEW - Prometheus metrics)
      aiTracing.ts (NEW - span utilities)

frontend/
  src/
    hooks/
      useAISuggestions.ts (NEW - debounced requests)
      useRequestManager.ts (NEW - cancellation & dedup)
    services/
      aiClient.ts (NEW - request lifecycle)
    components/
      builder/
        AIAssistantPanel.tsx (optimized)
        AIErrorBoundary.tsx (NEW)

worker/
  src/
    observability/
      queueMetrics.ts (NEW - queue monitoring)
      workerMetrics.ts (NEW - worker monitoring)
    processors/
      (existing with crash detection added)

shared/
  src/
    ai.ts (types - already exists, may expand)
    monitoring.ts (NEW - shared metric definitions)
```

---

## Success Criteria

✅ **Phase 1 Complete When:**
- AI requests debounced to 500ms
- No duplicate requests in-flight
- Cancelled requests when field changes
- Optimistic UI shows suggestions immediately
- No typing lag from AI requests

✅ **Phase 2 Complete When:**
- All API responses validated
- Errors categorized and logged
- Retries working with backoff
- Timeouts enforced (3s max)
- Request IDs tracked across system

✅ **Phase 3 Complete When:**
- Token usage in logs & metrics
- Queue depth tracked
- Worker crashes detected
- Grafana dashboard operational
- Alerts configured

✅ **Overall Complete When:**
- Zero breaking changes to existing APIs
- AI downtime doesn't affect editor
- Performance overhead < 50ms per request
- 99%+ reliability for fallback suggestions
- Extensible for new providers/models

