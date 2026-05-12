/**
 * In-memory sliding window rate limiter.
 * Used as a fallback when Redis is unavailable.
 * Note: per-process only — sufficient for single-instance free-tier deployments.
 */

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

export class MemoryRateLimiter {
  private counters = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Clean up expired entries every 60 seconds
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  consume(key: string, windowMs: number): { count: number; ttlSeconds: number } {
    const now = Date.now();
    const existing = this.counters.get(key);

    if (existing && now - existing.windowStart < windowMs) {
      existing.count += 1;
      const ttlSeconds = Math.max(0, Math.ceil((existing.windowStart + windowMs - now) / 1000));
      return { count: existing.count, ttlSeconds };
    }

    // Start a new window
    const entry: RateLimitEntry = { count: 1, windowStart: now };
    this.counters.set(key, entry);
    const ttlSeconds = Math.ceil(windowMs / 1000);
    return { count: 1, ttlSeconds };
  }

  cleanup(): void {
    const now = Date.now();
    // Remove entries whose windows have long expired (keep for 2x window duration)
    for (const [key, entry] of this.counters) {
      if (now - entry.windowStart > 1_800_000) {
        // 30 minutes max retention
        this.counters.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.counters.clear();
  }
}

/** Singleton instance shared across the backend process. */
export const memoryRateLimiter = new MemoryRateLimiter();
