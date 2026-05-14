Upstash and Cache Tuning

Purpose
- Reduce Upstash REST command usage on free tiers by using a per-process soft budget and local in-memory fallbacks.

Settings
- `UPSTASH_CALLS_PER_MIN` (number)
  - Default: `600` (set in `Backend/src/config/env.ts`).
  - Behaviour: Limits the number of Upstash REST calls this process will make per-minute. When exhausted the backend falls back to in-memory cache and in-memory rate limiter for reads/writes.
  - Recommendation: For low-traffic/starter deployments set to `300` or lower. If you see throttling errors, lower further.

- `USE_MEMORY_ONLY_CACHE` (boolean)
  - Default: `true` in development for zero Upstash usage.
  - Behaviour: When true the backend disables all Upstash/Redis-backed cache and rate-limiting and uses per-process in-memory fallbacks only. This uses no Upstash REST calls at all.
  - Recommendation: For single-instance deployments on free tiers set `USE_MEMORY_ONLY_CACHE=true`.

Notes & tradeoffs
- In-memory cache and rate limiters are per-process only. They do not provide cross-instance consistency and are not durable across restarts.
- The per-process `UPSTASH_CALLS_PER_MIN` reduces Upstash usage but is approximate; it’s a soft budget and designed to avoid sudden bursts. If you need strict cross-instance budgeting, consider centralizing a counter in a small shared service (which itself would use Upstash/Redis).
- If you run multiple API instances, the total Upstash calls will be roughly `UPSTASH_CALLS_PER_MIN * number_of_instances`.

Implementation details
- The budget is implemented in `Backend/src/utils/redis.ts`.
- When the budget is exhausted, the process logs a warning and falls back to `memoryCache` and `memoryRateLimiter` (files: `Backend/src/utils/memoryCache.ts`, `Backend/src/utils/memoryRateLimit.ts`).

Quick examples (env)
- Disable Upstash entirely (single-instance dev):

  ```bash
  USE_MEMORY_ONLY_CACHE=true
  ```

- Lower per-process Upstash calls to 300/min:

  ```bash
  UPSTASH_CALLS_PER_MIN=300
  ```

If you'd like, I can add a runtime metric that reports how many Upstash calls this process has consumed in the current window (useful for tuning)."}]},