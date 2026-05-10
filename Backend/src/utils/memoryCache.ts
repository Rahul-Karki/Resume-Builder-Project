/**
 * Lightweight in-memory LRU cache with TTL support.
 * Used as a fallback when Redis/Upstash is unavailable or to avoid
 * consuming Redis commands on the free tier.
 */

type CacheEntry = {
  value: string;
  expiresAt: number;
};

export class MemoryLRUCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end for LRU ordering
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: string, ttlSeconds: number): void {
    // Remove existing entry first (ensures LRU ordering)
    this.cache.delete(key);

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  deleteByPattern(pattern: string): number {
    const regex = new RegExp(
      "^" +
        pattern
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".") +
        "$",
    );

    let deleted = 0;

    for (const key of Array.from(this.cache.keys())) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted += 1;
      }
    }

    return deleted;
  }

  size(): number {
    return this.cache.size;
  }

  /** Remove all expired entries. Call periodically to reclaim memory. */
  cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

/** Singleton instance shared across the backend process. */
export const memoryCache = new MemoryLRUCache(200);
