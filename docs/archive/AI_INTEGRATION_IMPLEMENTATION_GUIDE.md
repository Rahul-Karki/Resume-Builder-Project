# AI Integration Implementation Summary

## Overview
This document summarizes the AI integration improvements made to the MERN resume builder application. All changes maintain backward compatibility with existing APIs and do not break any current frontend logic, autosave flow, resume templates, PDF generation, BullMQ workflows, or component hierarchies.

---

## Phase 1: Real-Time AI Optimization ✅ COMPLETE

### Frontend Hooks & Services

#### 1. `frontend/src/hooks/useRequestManager.ts` (NEW)
- **Purpose**: Manages in-flight AI requests with deduplication and cancellation
- **Key Features**:
  - `createRequest()`: Creates request with unique ID and AbortController
  - `isRequestInFlight()`: Check if request already pending
  - `cancelRequest()`: Cancel specific request
  - `cancelAll()`: Cancel all pending requests on unmount
- **Usage**:
  ```typescript
  const manager = useRequestManager();
  const { requestId, controller } = manager.createRequest("improve-text:field-123");
  // Later, if user changes field
  manager.cancelRequest("improve-text:field-123");
  ```

#### 2. `frontend/src/hooks/useAISuggestions.ts` (NEW)
- **Purpose**: Debounced AI suggestions with automatic cancellation
- **Key Features**:
  - 500ms default debounce to prevent excessive API calls
  - Automatic request deduplication
  - Exponential backoff retry (3 attempts, 100ms → 300ms → 900ms)
  - Request/response error handling
  - Loading state management
- **Configuration**:
  ```typescript
  const { suggestions, state, requestSuggestions } = useAISuggestions({
    debounceMs: 500,        // Debounce delay
    timeoutMs: 8000,        // Per-request timeout
    maxRetries: 2,          // Retry attempts
  });
  ```

#### 3. `frontend/src/services/aiClient.ts` (NEW)
- **Purpose**: Frontend API client for AI endpoints
- **Functions**:
  - `improveResumeTextClient()`: Call improve-text endpoint
  - `checkResumeGrammarClient()`: Call check-grammar endpoint
  - `enhanceResumeBulletClient()`: Call enhance-bullet endpoint
  - `validateAiResponse()`: Type-safe response validation
  - `categorizeAiError()`: Classify errors for better UX
  - `getAiErrorMessage()`: Extract user-friendly error text
- **Features**: Request ID header support, abort signal support, timeout handling

### Backend Token Counting

#### `Backend/src/utils/tokenCounter.ts` (NEW)
- **Purpose**: Token counting for AI cost tracking and logging
- **Key Features**:
  - `estimateTokenCount()`: Rough token count (1 token ≈ 4 chars)
  - `countOpenAITokens()`: OpenAI-specific token counting
  - `countGeminiTokens()`: Gemini-specific token counting
  - `calculateAICost()`: Cost estimation based on provider pricing
  - `formatCost()`: Format cost as USD string
- **Pricing** (Current as of 2024):
  - **OpenAI gpt-4o**: $5/M input, $15/M output
  - **OpenAI gpt-4o-mini**: $0.15/M input, $0.60/M output
  - **Gemini 2.0 Flash**: $0.075/M input, $0.30/M output

### Backend Service Enhancement

#### `Backend/src/services/aiService.ts` (MODIFIED)
- **Changes**:
  - Added `countOpenAITokens` and `countGeminiTokens` imports
  - Modified `runStructuredAi()` to return token usage metadata:
    - `_tokens`: { input, output } token counts
    - `_provider`: Which provider was used
    - `_model`: Which model was used
    - `_fallback`: Whether fallback was used
  - Token counting happens on both success and error paths

### AI Controller Enhancement

#### `Backend/src/controllers/aiController.ts` (ENHANCED)
- **New Request ID Tracking**:
  - Extracts `X-Request-ID` or `X-Correlation-ID` from headers
  - Passes through entire request lifecycle
  - Enables distributed tracing

- **Enhanced Logging**:
  ```typescript
  logger.info({
    requestId,           // Unique request trace ID
    userId,              // User making request
    aiType,              // Type: improve-text, check-grammar, enhance-bullet
    section,             // Resume section
    provider,            // openai or gemini
    model,               // Specific model used
    tokens: {            // Token usage
      input: 150,
      output: 200
    },
    cost: {              // Cost in USD
      input: "0.000001",
      output: "0.000003",
      total: "0.000004"
    },
    latencyMs,           // Request latency
    fallback             // Was fallback used?
  }, "AI request completed");
  ```

- **Metrics Tracking**:
  - Each request calls `trackAiRequest()` with metrics
  - Errors tracked separately via `trackValidationError()`
  - Fallback usage tracked in `aiFallbackRate` gauge

---

## Phase 2: Production Hardening ✅ COMPLETE

### Request Validation & Sanitization

#### `Backend/src/middleware/aiValidation.ts` (NEW)
- **Input Validation**:
  - Validates required fields: text, section
  - Enforces max lengths:
    - Text: 2500 characters max
    - Context: 1000 characters max
    - TargetRole: 160 characters max
  - Validates enum fields (section, tone)
  - All with detailed error messages
- **Input Sanitization**:
  - Removes null bytes
  - Limits consecutive newlines
  - Trims excessive whitespace
- **Response Validation**:
  - `validateAiResponse()`: Checks response structure
  - `detectHallucinations()`: Detects suspicious patterns
    - Too many suggestions (> 10)
    - Suspiciously short suggestions (< 5 chars)
    - Invalid JSON values (NaN, Infinity)

### Error Handling & Categorization

#### `Backend/src/middleware/aiErrorHandler.ts` (NEW)
- **Error Categories**:
  - `PROVIDER_ERROR`: AI service unavailable (503)
  - `TIMEOUT_ERROR`: Request exceeded limit (504)
  - `RATE_LIMIT_ERROR`: Rate limit hit (429)
  - `VALIDATION_ERROR`: Invalid input (400)
  - `MALFORMED_RESPONSE`: Invalid JSON (502)
  - `AUTH_ERROR`: Auth/credential issue (401)

- **Error Response Format**:
  ```typescript
  {
    success: false,
    error: {
      code: "TIMEOUT_ERROR",
      message: "AI request timed out. Please try again.",
      retryable: true
    }
  }
  ```

### Observability Metrics

#### `Backend/src/observability/aiMetrics.ts` (NEW)
- **AI Request Metrics**:
  - `ai_requests_total`: Counter by type/provider/status
  - `ai_request_duration_seconds`: Histogram by provider
  - `ai_tokens_used_total`: Counter by type/provider/token_type
  - `ai_fallback_rate`: Gauge showing fallback usage %
  - `ai_validation_errors_total`: Counter by error type
  - `ai_provider_errors_total`: Counter by provider/category

- **Provider Performance**:
  - `ai_provider_latency_seconds`: Histogram per provider
  - `ai_provider_success_rate`: Gauge (0-100) per provider
  - `ai_provider_quota_used_percent`: Usage tracking

- **Response Quality**:
  - `ai_malformed_responses_total`: Counter per provider
  - `ai_hallucination_detected_total`: Counter by type/reason

- **Queue & Worker Metrics**:
  - `queue_depth`: Current jobs in queue
  - `queue_jobs_processed_total`: Counter by status
  - `queue_job_duration_seconds`: Histogram by type
  - `queue_job_failures_total`: Counter by failure type
  - `worker_crashes_total`: Counter by reason/queue
  - `worker_stalled_jobs`: Gauge for > 30 min jobs

---

## Phase 3: Worker Monitoring ✅ COMPLETE

### Worker Health & Observability

#### `worker/src/observability/workerMetrics.ts` (NEW)
- **Crash Detection**:
  ```typescript
  initializeWorkerCrashHandling({
    queue: "ats-analysis",
    processorName: "ats.processor",
  });
  ```
  - Catches uncaught exceptions and unhandled rejections
  - Logs full error context
  - Increments `worker_crashes_total` metric

- **Job Completion Tracking**:
  ```typescript
  trackJobCompletion(
    "ats-analysis",
    "ats-analysis",
    "success",
    1234,  // durationMs
    0      // retries
  );
  ```

- **Stalled Job Detection**:
  - Detects jobs stuck > 30 minutes
  - Logs job IDs and count
  - Updates `worker_stalled_jobs` gauge

- **Safe Job Processor**:
  ```typescript
  const safeProcessor = createSafeJobProcessor(
    async (job) => { /* ... */ },
    {
      queue: "ats-analysis",
      jobType: "ats-analysis",
      timeoutMs: 60000,
    }
  );
  ```
  - Wraps processor with timeout
  - Handles errors and metrics
  - Retries on transient failures

---

## Phase 4: Extensibility Layer ✅ COMPLETE

### AI Provider Abstraction

#### `Backend/src/services/aiProviders.ts` (NEW)
- **Provider Interface**:
  ```typescript
  abstract class BaseAiProvider {
    abstract generateStructuredResponse<T>(
      systemPrompt: string,
      userPrompt: string,
      schema?: Record<string, unknown>
    ): Promise<AiProviderResponse<T>>;
    
    abstract generateTextResponse(
      systemPrompt: string,
      userPrompt: string
    ): Promise<AiProviderResponse<string>>;
    
    abstract isAvailable(): Promise<boolean>;
  }
  ```

- **Provider Factory**:
  ```typescript
  // Register new provider
  AiProviderFactory.registerProvider("claude", ClaudeProvider);
  
  // Create instance
  const provider = AiProviderFactory.createProvider({
    name: "claude",
    apiKey: process.env.CLAUDE_API_KEY,
  });
  ```

- **Provider Manager** (with fallback):
  ```typescript
  const manager = new AiProviderManager(
    [geminiProvider, openaiProvider],
    "gemini",           // Preferred
    ["openai"]          // Fallback order
  );
  
  // Auto-failover if Gemini fails
  const { response, provider } = await manager.generateStructuredResponseWithFallback<T>(
    systemPrompt,
    userPrompt
  );
  ```

---

## API Contract Changes

### New Response Fields (Backward Compatible)
AI endpoint responses now include token/cost info (filtered before response):

```typescript
// Internal (not sent to client)
{
  suggestions: [...],
  _tokens: { input: 150, output: 200 },
  _provider: "gemini",
  _model: "gemini-2.0-flash",
  _fallback: false
}

// Client receives (tokens stripped)
{
  suggestions: [...]
}
```

### Request Headers (Optional)
Client can now send request ID for tracing:
```
X-Request-ID: uuid-here
X-Correlation-ID: uuid-here (fallback)
```

### Error Response Format (Enhanced)
```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT_ERROR",
    "message": "AI request timed out. Please try again.",
    "retryable": true,
    "details": [...] // Only in dev mode
  }
}
```

---

## Configuration & Environment Variables

No new required environment variables. Existing variables used:
- `AI_PROVIDER`: Preferred provider (openai|gemini)
- `OPENAI_API_KEY`: OpenAI credentials
- `GEMINI_API_KEY`: Gemini credentials
- `ENABLE_METRICS`: Enable Prometheus metrics (true|false)
- `LOG_LEVEL`: Logging level (debug|info|warn|error)

---

## Monitoring & Alerting Setup

### Prometheus Dashboard Queries
```promql
# AI Success Rate
rate(resume_builder_ai_requests_total{status="success"}[5m]) / 
rate(resume_builder_ai_requests_total[5m]) * 100

# Average Latency by Provider
histogram_quantile(0.95, 
  rate(resume_builder_ai_request_duration_seconds_bucket[5m])
)

# Token Cost per Day
sum(resume_builder_ai_tokens_used_total{token_type="output"}) * 0.000003

# Queue Depth
resume_builder_queue_depth{queue="ats-analysis"}
```

### Grafana Alert Rules
```yaml
- name: AI Service Health
  rules:
    - alert: AILatencyHigh
      expr: histogram_quantile(0.95, rate(...)) > 3
      for: 5m
      
    - alert: AIProviderErrors
      expr: rate(ai_provider_errors_total[5m]) > 0.05
      for: 5m
      
    - alert: WorkerCrashed
      expr: rate(worker_crashes_total[5m]) > 0
      for: 1m
      
    - alert: QueueDepthHigh
      expr: queue_depth > 1000
      for: 5m
```

---

## Testing

### Frontend Testing
```typescript
// Test debouncing
await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

// Test cancellation
userEvent.type(inputElement, "test");
expect(requestManager.isRequestInFlight("improve-text:field")).toBe(true);
userEvent.clear(inputElement);
expect(requestManager.isRequestInFlight("improve-text:field")).toBe(false);

// Test error handling
api.post.mockRejectedValue(new Error("Timeout"));
await expect(requestSuggestions(...)).rejects.toThrow();
expect(state.error).toContain("timeout");
```

### Backend Testing
```typescript
// Test validation
const result = validateAiInput({ text: "", section: "invalid" });
expect(result.valid).toBe(false);
expect(result.errors.length).toBeGreaterThan(0);

// Test error categorization
const context = categorizeAiError(new Error("429 too many requests"));
expect(context.category).toBe("RATE_LIMIT_ERROR");
expect(context.retryable).toBe(true);

// Test metrics
trackAiRequest("improve-text", "gemini", "success", 1000, tokens);
expect(aiRequestsTotal.get()).toContainEqual(
  expect.objectContaining({ labels: ["improve-text", "gemini", "success"] })
);
```

---

## Migration Guide

### For Existing Frontend Code
✅ **No changes required** - All new features are opt-in and backward compatible

### To Enable New Features
1. Update AI request code to use new hooks:
   ```typescript
   // Before
   const result = await api.post('/ai/improve-text', data);
   
   // After (optional, for better UX)
   const { suggestions, state, requestSuggestions } = useAISuggestions();
   requestSuggestions('/api/ai/improve-text', data, fieldId);
   ```

2. Add request ID to trace requests:
   ```typescript
   const requestId = uuidv4();
   api.post('/ai/improve-text', data, {
     headers: { 'X-Request-ID': requestId }
   });
   ```

### For New Providers
1. Create provider class extending `BaseAiProvider`:
   ```typescript
   export class ClaudeProvider extends BaseAiProvider {
     async generateStructuredResponse<T>(...) {
       // Implementation
     }
   }
   ```

2. Register provider:
   ```typescript
   AiProviderFactory.registerProvider("claude", ClaudeProvider);
   ```

3. Update manager:
   ```typescript
   manager.setFallbackProviders(["claude", "openai"]);
   ```

---

## Troubleshooting

### High AI Latency
- Check provider health: `await provider.isAvailable()`
- Monitor queue depth: Check BullMQ queue backlog
- Check network: Verify provider API connectivity
- Review token costs: May need to optimize prompts

### Frequent Timeouts
- Increase timeout in config (default 8s for frontend, 3s for backend)
- Check provider rate limits
- Verify network stability
- Review logs for specific failures

### Worker Crashes
- Check `worker_crashes_total` metric
- Review worker logs for error messages
- Ensure sufficient memory for queue processor
- Check for infinite loops in processor code

### High Hallucination Rate
- Review detection threshold in `detectHallucinations()`
- Consider stricter prompts
- May indicate provider issues (try fallback provider)
- Check input quality (very short inputs may cause issues)

---

## Performance Considerations

- **Debounce Delay**: 500ms balances responsiveness and API load
- **Request Timeout**: 8s frontend, 3s backend gives reasonable latency
- **Max Retries**: 2 retries cover most transient failures
- **Token Budget**: Monitor daily token usage to control costs
- **Queue Depth**: Stall detection at 30 minutes prevents queue buildup

---

## Future Enhancements

1. **Streaming Responses**: Real-time suggestion streaming using SSE
2. **Voice AI**: Audio input for resume dictation
3. **Advanced Metrics**: AI suggestion acceptance rate, cost per unit
4. **Custom Prompts**: User-defined AI prompt templates
5. **Batch Processing**: Batch multiple AI requests for cost savings
6. **Analytics Dashboard**: UI for AI usage analytics
7. **Rate Limiting per User**: Per-user daily AI request limits

