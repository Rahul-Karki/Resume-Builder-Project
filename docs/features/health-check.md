---
# Feature: Health Check
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Provides lightweight and detailed health check endpoints for monitoring service availability, dependency status, and uptime SLA tracking.

## User Stories
- As a platform operator, I want a simple health endpoint that my load balancer can ping so that it knows the service is alive.
- As an operator, I want to check the status of individual dependencies (MongoDB, Redis) so that I can diagnose outages.

## Scope
### In scope
- Basic health check: returns 200 if MongoDB is responsive, 503 if not
- Deep health check: same as basic (alias)
- Redis health check (skipped when using in-memory cache)
- Three status levels: ok, degraded (Redis down), unhealthy (MongoDB down)
- Resume download system health: queue depth, worker heartbeat freshness
- Uptime endpoint: service uptime, start time, SLA target
- Prometheus metrics on the uptime registry
- Health check counter metrics

### Out of scope
- Database replication lag monitoring
- External dependency checks beyond Mongo and Redis

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/router/health.routes.ts | All health endpoints with MongoDB ping, Redis health, queue status |
| Backend/src/utils/redis.ts | checkRedisHealth, getCacheProvider |
| Backend/src/models/ResumeDownloadJob.ts | Queue job count aggregation |
| Backend/src/models/WorkerHeartbeat.ts | Worker freshness check |

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| GET | /health | No | Basic health (200/503) |
| GET | /health/deep | No | Deep health (alias for /health) |
| GET | /health/downloads | No | Resume download system health |
| GET | /health/uptime | No | Uptime, start time, SLA target |
| GET | /api/health | No | Basic health via API prefix |
| GET | /api/health/deep | No | Deep health via API prefix |
| GET | /health/metrics | No | Prometheus uptime metrics |

## Edge Cases & Error Handling
- If the MongoDB connection is lost, the system returns 503 unhealthy (MongoDB is the only hard dependency).
- If Redis is unavailable but the in-memory cache is active, the system returns 200 degraded — the app continues with in-memory fallbacks.
- If the worker heartbeat is stale, the download health endpoint returns 503 degraded.
- If the queue job count aggregation fails, the system returns 503 with error details.

## Tests
- Unit: __tests__/integration/health.test.ts

## Open Questions
- Should the /health/downloads endpoint be deprecated now that the worker service is removed? (owner: TBD)
