# Production Deployment Guide

This guide covers the production-hardening features implemented for the Resume Builder application, including error tracking, health checks, rate limiting, and environment configuration.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Error Tracking with Sentry](#error-tracking-with-sentry)
3. [Health Checks](#health-checks)
4. [Rate Limiting](#rate-limiting)
5. [Database & Redis Configuration](#database--redis-configuration)
6. [Security & Headers](#security--headers)
7. [Observability](#observability)
8. [Deployment Checklist](#deployment-checklist)

---

## Environment Setup

### Backend Configuration

Copy `.env.example` to `.env` and configure the following sections:

```bash
cp Backend/.env.example Backend/.env
```

#### Core Settings
```env
NODE_ENV=production
PORT=5000
SERVICE_NAME=resume-builder-backend
SERVICE_VERSION=1.0.0
```

#### Frontend Communication
```env
FRONTEND_URL=https://your-frontend-domain.com
FRONTEND_URLS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

#### Database & Redis
See [Database & Redis Configuration](#database--redis-configuration) section below.

### Frontend Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
cp frontend/.env.example frontend/.env.local
```

```env
VITE_BASE_URL=https://your-frontend-domain.com
VITE_API_BASE_URL=https://your-backend-domain.com/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project_id
VITE_SENTRY_ENVIRONMENT=production
```

---

## Error Tracking with Sentry

### Setup

1. **Create a Sentry Account** at https://sentry.io
2. **Create Projects** for both backend and frontend
3. **Get Your DSN** from project settings → Client Keys (DSN)

### Backend Configuration

```env
SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_PROJECT_ID
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
```

**Environment Values:**
- `development`: For local development (not sent to Sentry)
- `staging`: For staging deployments
- `production`: For production deployments

**Traces Sample Rate:**
- `0.01` = 1% of requests (low overhead)
- `0.1` = 10% of requests (default, balanced)
- `1.0` = 100% of requests (high overhead, use carefully)

### Frontend Configuration

```env
VITE_SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_FRONTEND_PROJECT_ID
VITE_SENTRY_ENVIRONMENT=production
```

### What Gets Tracked

**Backend:**
- Unhandled exceptions and errors
- 5xx HTTP responses (automatically captured)
- Request context: trace ID, method, route, query parameters, user info
- Performance metrics (if tracing enabled)

**Frontend:**
- Unhandled JavaScript errors
- Caught exceptions (via `captureClientException()`)
- React component errors (via Error Boundary)
- Performance metrics (Page Load, React Profiler)

### Verifying Sentry Integration

1. **Backend**: Check server startup logs for "Sentry initialized" message
2. **Frontend**: Check browser console for Sentry SDK initialization (not logged, but no errors)
3. **Test Event**: 
   ```bash
   # Backend - trigger a 500 error
   curl http://localhost:5000/api/invalid-route
   
   # Frontend - check browser console
   # A test error will be sent to Sentry
   ```

---

## Health Checks

### Endpoint

```
GET /api/health
```

### Response Format

```json
{
  "status": "ok|degraded",
  "mongo": "up|down",
  "redis": "up|down"
}
```

### Status Codes

- **200 OK**: All dependencies healthy
- **503 Service Unavailable**: One or more dependencies down

### Real Dependency Checks

Unlike simple readiness probes, the health endpoint performs actual operations:

- **MongoDB**: Runs `ping()` command to verify connectivity
- **Redis**: 
  - **Native Redis**: Runs `PING` command
  - **Upstash (REST)**: Sends HTTP request to verify REST API connectivity

### Monitoring Integration

Configure your orchestrator to poll `/api/health`:

```yaml
# Kubernetes Example
livenessProbe:
  httpGet:
    path: /api/health
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/health
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

---

## Rate Limiting

Rate limiting is implemented using Redis to prevent abuse on expensive operations.

### Configuration

```env
REDIS_RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
REDIS_RATE_LIMIT_MAX=100             # Base limit (adjusted per endpoint)
```

### Protected Endpoints

| Endpoint | Max Requests | Window | Purpose |
|----------|-------------|--------|---------|
| POST /api/resumes | 10 | 15 min | Resume creation |
| PUT /api/resumes/:id | 10 | 15 min | Resume updates |
| POST /api/resumes/:id/export-pdf | 5 | 15 min | PDF export |
| POST /api/resumes/:id/export-pdf-safe | 5 | 15 min | Safe PDF export |

### Rate Limiting Key

Rate limits are tracked per:
- **Authenticated User**: `user:{userId}`
- **Anonymous IP**: `ip:{ipAddress}`

### Response

When rate limit exceeded:

```
HTTP 429 Too Many Requests

{
  "message": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "traceId": "correlation-id"
}
```

### Disabling Rate Limiting

If Redis is unavailable, rate limiting is gracefully disabled with a warning log. Requests will proceed without limits.

---

## Database & Redis Configuration

### MongoDB

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/resume_builder_prod
```

**Production Best Practices:**
- Use MongoDB Atlas with IP allowlist
- Enable encryption at rest
- Use connection pooling (default: 10 connections)
- Set connection timeout: `MONGO_CONNECT_TIMEOUT=10000`

### Redis Configuration

**Option 1: Native Redis**

```env
REDIS_URL=redis://user:password@redis-host:6379/0
REDIS_CONNECT_TIMEOUT_MS=5000
```

**Option 2: Upstash (Serverless Redis)**

```env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_rest_token
REDIS_CONNECT_TIMEOUT_MS=5000
```

**Settings:**
- `REDIS_CACHE_TTL_SECONDS=300` (5 minutes default)
- `REDIS_CONNECT_TIMEOUT_MS=5000` (connection timeout)

**Cache Scopes:**
The application uses versioned cache scopes for safe invalidation:

```
v1:public-templates         # Public resume templates
v1:admin-templates          # Admin-managed templates
v1:admin-dashboard          # Dashboard metrics cache
v1:admin-analytics          # Analytics data cache
v1:admin-templates-item     # Individual template cache
v1:resumes-user:{userId}    # Per-user resume cache
```

Incrementing `CACHE_VERSION` in code invalidates all cached data.

---

## Security & Headers

### CSRF Protection

- All state-changing requests (POST, PUT, DELETE) require CSRF token
- Token issued on login and refresh endpoints
- Token sent via `X-CSRF-Token` header
- Token validated on each mutation

### CORS Configuration

```env
FRONTEND_URLS=https://domain1.com,https://domain2.com
```

**Important**: Only explicitly listed origins are allowed. Wildcards are not permitted.

### Security Headers (via Helmet)

Automatically added:
- `Strict-Transport-Security`: HSTS for 1 year
- `X-Content-Type-Options`: Prevent MIME sniffing
- `X-Frame-Options`: Prevent clickjacking
- `CSP`: Restrict resource origins
- And more...

### JWT Secrets

```env
JWT_ACCESS_SECRET=min_32_chars_random_string_here_12345
JWT_REFRESH_SECRET=different_min_32_chars_random_string_456
```

**Generation:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Observability

### Logging

```env
LOG_LEVEL=info  # error, warn, info, debug
```

All logs include:
- Service name and version
- Environment
- Timestamp (ISO 8601)
- Trace ID and Correlation ID
- Request metadata (method, path, IP)
- Response status code
- Request duration (ms)

### Metrics

```env
ENABLE_METRICS=true
METRICS_PATH=/metrics
```

Access Prometheus metrics at: `GET /metrics`

Metrics include:
- HTTP request duration (histogram)
- Request count (counter)
- Active connections (gauge)
- Cache hit/miss rates
- Redis operation timings

### OpenTelemetry (Optional)

For distributed tracing integration with Grafana, Datadog, etc.:

```env
OTEL_SERVICE_NAME=resume-builder-backend
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-collector.example.com
OTEL_TRACES_SAMPLER_ARG=0.1
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured (see `.env.example`)
- [ ] Sentry DSN created for backend and frontend
- [ ] MongoDB URI points to production cluster
- [ ] Redis connection tested (native or Upstash)
- [ ] JWT secrets generated and stored securely
- [ ] Frontend URLs configured for CORS
- [ ] SSL certificates installed (if not using reverse proxy)

### Backend

- [ ] Run `npm run build` successfully compiles
- [ ] Run `npm test` passes (42+ tests)
- [ ] Health endpoint responds: `GET /api/health`
- [ ] MongoDB connection test passes
- [ ] Redis connectivity verified
- [ ] Sentry initialization successful

### Frontend

- [ ] Run `npm run build` completes without errors
- [ ] Vite output in `dist/` folder
- [ ] Assets properly minified
- [ ] Source maps generated for Sentry
- [ ] Environment variables injected (VITE_* prefix)
- [ ] Service worker ready (if PWA enabled)

### Post-Deployment

- [ ] Test error tracking: Trigger test error and verify in Sentry
- [ ] Test rate limiting: Rapid requests should return 429
- [ ] Monitor logs for errors or warnings
- [ ] Verify health checks responding correctly
- [ ] Check cache hit rates in logs
- [ ] Monitor Redis connection status
- [ ] Verify Sentry is capturing both backend and frontend errors
- [ ] Load test endpoints to establish baseline metrics

### Monitoring Setup

Set up alerts for:
1. **Health Endpoint**: `/api/health` returns 503
2. **Error Rate**: 5xx errors > 1% of requests
3. **Response Time**: p95 latency > 5 seconds
4. **Sentry Alerts**: Configured in project settings
5. **Redis Connectivity**: Connection timeouts or unavailability
6. **Rate Limiting**: High usage patterns suggesting DDoS

---

## Troubleshooting

### Sentry Not Capturing Errors

1. Verify `SENTRY_DSN` is set and valid
2. Check `NODE_ENV=test` disables Sentry (expected)
3. Verify network connectivity to sentry.io
4. Check browser console for frontend errors
5. Ensure error is actually throwing (not caught silently)

### Health Check Returns 503

1. **MongoDB down**: Check `MONGO_URI` connection
2. **Redis down**: 
   - Check `REDIS_URL` or Upstash credentials
   - Verify IP allowlist if using Upstash
   - Ensure network connectivity

### Rate Limiting Not Working

1. Verify Redis is connected (check health endpoint)
2. Confirm `REDIS_RATE_LIMIT_WINDOW_MS` is set
3. Check logs for "Cache write skipped" messages (Redis unavailable)

### High Memory Usage

1. Check MongoDB connection pool size
2. Monitor Redis memory (especially Upstash)
3. Review cache TTL settings
4. Check for unbounded arrays in resume data

---

## Production Safety Recommendations

1. **Use environment-specific configurations** (separate Sentry projects)
2. **Enable database replication** for MongoDB (3+ nodes)
3. **Set up automated backups** (MongoDB Atlas recommended)
4. **Use Redis with persistence** (AOF or RDB)
5. **Enable authentication** for all databases
6. **Restrict network access** via firewalls/security groups
7. **Use HTTPS/TLS** for all communication
8. **Rotate secrets regularly** (JWT, API keys)
9. **Monitor resource usage** (CPU, memory, disk)
10. **Plan for graceful degradation** (e.g., if Redis unavailable)

---

## References

- [Sentry Documentation](https://docs.sentry.io/)
- [MongoDB Atlas Production Checklist](https://docs.atlas.mongodb.com/security-checklist/)
- [Upstash Documentation](https://upstash.com/docs/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
