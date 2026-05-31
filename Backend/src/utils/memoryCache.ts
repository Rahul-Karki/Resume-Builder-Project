import { env } from "../config/env";

type CacheEntry = {
  value: string;
  expiresAt: number;
};

export class MemoryLRUCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

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

    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: string, ttlSeconds: number): void {
    this.cache.delete(key);

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

    this.registerTag(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Tag index: maps a cache key prefix to the set of matching keys for fast pattern deletion. */
  private tagIndex = new Map<string, Set<string>>();

  private registerTag(key: string): void {
    const colonIdx = key.indexOf(":");
    if (colonIdx === -1) return;
    const prefix = key.substring(0, colonIdx);
    let keys = this.tagIndex.get(prefix);
    if (!keys) {
      keys = new Set();
      this.tagIndex.set(prefix, keys);
    }
    keys.add(key);
  }

  deleteByPattern(pattern: string): number {
    // Fast path: pattern ends with ":*" or is "*" — use tag index
    const colonStar = pattern.endsWith(":*") || pattern === "*";

    if (colonStar) {
      const prefix = pattern.slice(0, -2);
      const tagged = this.tagIndex.get(prefix);
      if (tagged) {
        let deleted = 0;
        for (const key of tagged) {
          if (this.cache.delete(key)) deleted++;
        }
        this.tagIndex.delete(prefix);
        return deleted;
      }
      // Tag not found for this prefix — fall through to regex
    }

    // Fallback: build regex for complex patterns (rare)
    // NOTE: this scan is O(n) in the number of cached entries — avoid heavy use
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

  cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /** Start periodic cleanup at the given interval (ms). */
  startCleanup(intervalMs = 60000): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.cleanup(), intervalMs);
    this.cleanupTimer.unref();
  }

  /** Stop periodic cleanup. */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const memoryCache = new MemoryLRUCache(env.MEMORY_CACHE_MAX_SIZE);
memoryCache.startCleanup(60000);
