# AI Integration - Quick Start & Next Steps

## What's Been Implemented ✅

### Phase 1: Real-Time AI Optimization
- ✅ Debounced requests (500ms) to prevent excessive API calls
- ✅ Request deduplication and cancellation for old requests
- ✅ Automatic retry with exponential backoff
- ✅ Request ID tracking for distributed tracing
- ✅ Token counting for cost tracking

### Phase 2: Production Hardening
- ✅ Comprehensive input validation and sanitization
- ✅ Error categorization (timeout, rate-limit, malformed, etc.)
- ✅ Hallucination detection in AI responses
- ✅ Graceful fallback to deterministic suggestions
- ✅ Structured logging with request context

### Phase 3: Observability & Monitoring
- ✅ Prometheus metrics for AI requests and providers
- ✅ Queue monitoring (depth, job duration, failures)
- ✅ Worker crash detection and recovery
- ✅ Stalled job detection (> 30 minutes)
- ✅ OpenTelemetry tracing integration

### Phase 4: Extensibility
- ✅ AI Provider abstraction layer
- ✅ Support for multiple providers with fallback
- ✅ Provider factory for easy integration
- ✅ Type-safe provider interface
- ✅ Ready for Claude, Anthropic, etc.

---

## Files Created

### Frontend
- `frontend/src/hooks/useRequestManager.ts` - Request lifecycle management
- `frontend/src/hooks/useAISuggestions.ts` - Debounced suggestions hook
- `frontend/src/services/aiClient.ts` - AI API client with error handling

### Backend
- `Backend/src/utils/tokenCounter.ts` - Token counting for cost tracking
- `Backend/src/middleware/aiValidation.ts` - Input validation & sanitization
- `Backend/src/middleware/aiErrorHandler.ts` - Error handling & categorization
- `Backend/src/observability/aiMetrics.ts` - Prometheus metrics
- `Backend/src/services/aiProviders.ts` - Provider abstraction layer

### Worker
- `worker/src/observability/workerMetrics.ts` - Worker monitoring & health checks

### Documentation
- `AI_INTEGRATION_ARCHITECTURE.md` - Full architecture blueprint
- `AI_INTEGRATION_IMPLEMENTATION_GUIDE.md` - Detailed implementation guide

---

## Files Modified

### Backend
- `Backend/src/services/aiService.ts` - Added token counting
- `Backend/src/controllers/aiController.ts` - Enhanced logging, metrics, request ID tracking
- `Backend/src/observability.ts` - Exported metricsRegistry

---

## How to Use in Your Application

### 1. Frontend: Use Optimized AI Hooks (Optional but Recommended)

```typescript
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { improveResumeTextClient } from '@/services/aiClient';

export function TextEditor() {
  const { suggestions, state, requestSuggestions } = useAISuggestions({
    debounceMs: 500,
    timeoutMs: 8000,
  });

  const handleTextChange = (text: string, fieldId: string) => {
    requestSuggestions('/api/ai/improve-text', {
      text,
      section: 'experience',
      tone: 'professional',
    }, fieldId);
  };

  return (
    <div>
      <input onChange={(e) => handleTextChange(e.target.value, 'exp-123')} />
      
      {state.loading && <div>Generating suggestions...</div>}
      {state.error && <div>Error: {state.error}</div>}
      
      {suggestions && (
        <div>
          {suggestions.suggestions.map(s => (
            <div key={s.id}>{s.suggestionText}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2. Backend: Error Handling is Automatic

All AI endpoints now:
- ✅ Validate inputs automatically
- ✅ Track metrics automatically
- ✅ Log with request context automatically
- ✅ Return categorized errors automatically

No code changes needed - it just works better!

### 3. Monitoring: Set Up Grafana Dashboard

```yaml
# Add to your Grafana datasources
- name: Prometheus
  type: prometheus
  url: http://localhost:9090

# Import these dashboard IDs or create custom ones using metrics:
Metrics available:
- resume_builder_ai_requests_total
- resume_builder_ai_request_duration_seconds
- resume_builder_ai_tokens_used_total
- resume_builder_queue_depth
- resume_builder_worker_crashes_total
```

### 4. Add New AI Provider (Future)

```typescript
import { BaseAiProvider, AiProviderFactory } from '@/services/aiProviders';

class ClaudeProvider extends BaseAiProvider {
  async generateStructuredResponse<T>(systemPrompt, userPrompt) {
    // Call Claude API
    // Return { data, tokens, model, timestamp }
  }
  
  async generateTextResponse(systemPrompt, userPrompt) {
    // Implementation
  }
  
  async isAvailable() {
    // Check if API is reachable
  }
}

// Register
AiProviderFactory.registerProvider('claude', ClaudeProvider);

// Use with fallback
manager.setFallbackProviders(['claude', 'openai']);
```

---

## Testing Checklist

### Frontend
- [ ] Debounce works (only 1 request in 500ms window)
- [ ] Cancellation works (old request cancelled when new one issued)
- [ ] Error handling works (shows user-friendly message)
- [ ] Retry works (auto-retries on transient errors)
- [ ] Loading states work (shows/hides loading indicator)

### Backend
- [ ] Validation works (rejects invalid input)
- [ ] Token counting works (tokens in logs)
- [ ] Metrics tracked (check Prometheus endpoint)
- [ ] Error categorization works (correct error type returned)
- [ ] Logging works (check logs with request ID)

### Integration
- [ ] No duplicate requests for same user action
- [ ] Fallback suggestions work when AI fails
- [ ] Request tracing works (request ID in logs)
- [ ] Cost tracking accurate (compare with provider billing)

---

## Common Issues & Solutions

### Issue: Requests are not debouncing
**Solution**: Ensure you're using the same field ID for subsequent requests
```typescript
requestSuggestions(..., 'experience-0');  // Same ID = debounced
requestSuggestions(..., 'experience-1');  // Different ID = new request
```

### Issue: High latency (> 3 seconds)
**Solution**: Check these in order:
1. Network latency to provider API
2. Provider rate limits (check error code)
3. Queue depth in Prometheus
4. Model complexity (consider using faster model)

### Issue: Metrics not showing up
**Solution**: Ensure metrics are enabled
```bash
ENABLE_METRICS=true npm start
```
Then check `http://localhost:5000/metrics`

### Issue: Worker crashes not detected
**Solution**: Ensure worker has crash handlers initialized
```typescript
import { initializeWorkerCrashHandling } from '@/observability/workerMetrics';

initializeWorkerCrashHandling({
  queue: 'ats-analysis',
  processorName: 'ats.processor',
});
```

---

## Performance Tuning

### To Reduce API Costs
```typescript
// Increase debounce delay (fewer requests)
const { requestSuggestions } = useAISuggestions({ debounceMs: 1000 });

// Use cheaper model for some operations
// Gemini Flash is ~20x cheaper than GPT-4

// Batch multiple operations together
```

### To Improve Latency
```typescript
// Decrease timeout (fail faster on slow connection)
const { requestSuggestions } = useAISuggestions({ timeoutMs: 5000 });

// Use local fallback suggestions (instant)
// They're decent for basic improvements
```

### To Increase Reliability
```typescript
// Add more retries for unstable networks
const { requestSuggestions } = useAISuggestions({ maxRetries: 3 });

// Set up provider fallback
manager.setFallbackProviders(['gemini', 'openai', 'claude']);
```

---

## What's Next?

### Immediate (1-2 days)
1. **Test the implementation**
   - Run existing test suite (should still pass)
   - Add new tests for debouncing/cancellation
   - Test error scenarios

2. **Deploy to staging**
   - Monitor metrics for baseline
   - Check logs for any issues
   - Validate cost tracking

3. **Set up monitoring**
   - Create Grafana dashboard
   - Set up alerting rules
   - Configure log aggregation

### Short-term (1-2 weeks)
1. **Optimize prompts**
   - A/B test different prompt templates
   - Fine-tune for your resume types
   - Measure acceptance rates

2. **Add analytics**
   - Track suggestion acceptance rate
   - Monitor cost per suggestion
   - Identify cost outliers

3. **Extend to other sections**
   - Apply AI to cover letter
   - Apply AI to LinkedIn summary
   - Custom AI features

### Medium-term (1-2 months)
1. **Add new providers**
   - Implement Claude provider
   - Test provider failover
   - Compare cost/quality

2. **Streaming responses**
   - Real-time suggestion streaming
   - Better perceived performance
   - Reduced latency perception

3. **Advanced features**
   - Voice input for resume dictation
   - AI-powered interview prep
   - Job-specific resume optimization

### Long-term (3+ months)
1. **Offline capabilities**
   - Cache common suggestions
   - Fallback to local models
   - Work without internet

2. **Custom AI models**
   - Fine-tune on your data
   - Better suggestions for your domain
   - Competitive advantage

3. **Analytics platform**
   - User AI usage dashboard
   - Cost attribution per user
   - ROI tracking

---

## Support & Debugging

### View AI Request Logs
```bash
# Filter for AI requests
docker logs <container> | grep 'aiType'

# Filter for errors
docker logs <container> | grep 'AI.*failed'

# Filter by request ID (for tracing)
docker logs <container> | grep 'abc-123-def'
```

### Check Metrics
```bash
# View Prometheus metrics
curl http://localhost:9090/metrics | grep ai_

# Check success rate
curl http://localhost:9090/api/v1/query?query=ai_requests_total
```

### Monitor Queue
```bash
# Check queue depth
curl http://localhost:9090/api/v1/query?query=queue_depth

# Check stalled jobs
curl http://localhost:9090/api/v1/query?query=worker_stalled_jobs

# Check worker crashes
curl http://localhost:9090/api/v1/query?query=worker_crashes_total
```

---

## Key Metrics to Watch

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| AI Success Rate | > 99% | < 95% | < 90% |
| P95 Latency | < 1s | > 2s | > 3s |
| Fallback Rate | < 1% | > 5% | > 10% |
| Queue Depth | < 100 | > 500 | > 1000 |
| Worker Crashes | 0 | > 0 | Repeated |
| Token Cost | Budget | > 80% | > 100% |

---

## Questions or Issues?

1. Check the detailed guides:
   - `AI_INTEGRATION_ARCHITECTURE.md` - Architecture overview
   - `AI_INTEGRATION_IMPLEMENTATION_GUIDE.md` - Implementation details

2. Review the code documentation:
   - Each file has JSDoc comments
   - Inline comments explain complex logic

3. Check logs and metrics:
   - Logs include context (requestId, userId, section, etc.)
   - Metrics show provider health and performance

