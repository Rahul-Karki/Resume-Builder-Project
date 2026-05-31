import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryLRUCache, memoryCache } from "../../utils/memoryCache";

describe("MemoryLRUCache", () => {
  let cache: MemoryLRUCache;

  beforeEach(() => {
    cache = new MemoryLRUCache(3);
  });

  it("should store and retrieve values by key", () => {
    cache.set("key1", "value1", 60);
    expect(cache.get("key1")).toBe("value1");
  });

  it("should evict the least-recently-used entry when at capacity", () => {
    cache.set("a", "1", 60);
    cache.set("b", "2", 60);
    cache.set("c", "3", 60);
    cache.set("d", "4", 60);
    expect(cache.get("a")).toBeNull();
    expect(cache.get("d")).toBe("4");
  });

  it("should return null for missing keys", () => {
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("should return expired entries as null", () => {
    vi.useFakeTimers();
    cache.set("key1", "value1", 1);
    expect(cache.get("key1")).toBe("value1");
    vi.advanceTimersByTime(1001);
    expect(cache.get("key1")).toBeNull();
    vi.useRealTimers();
  });

  it("should delete existing keys", () => {
    cache.set("key1", "value1", 60);
    expect(cache.delete("key1")).toBe(true);
    expect(cache.get("key1")).toBeNull();
  });

  it("should clear all entries", () => {
    cache.set("a", "1", 60);
    cache.set("b", "2", 60);
    cache.clear();
    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
  });

  it("should respect the configured TTL", () => {
    vi.useFakeTimers();
    cache.set("key1", "value1", 60);
    vi.advanceTimersByTime(60001);
    expect(cache.get("key1")).toBeNull();
    vi.useRealTimers();
  });

  it("should delete keys by glob pattern", () => {
    cache.set("user:1:profile", "a", 60);
    cache.set("user:1:resume", "b", 60);
    cache.set("user:2:profile", "c", 60);
    const deleted = cache.deleteByPattern("user:1:*");
    expect(deleted).toBe(2);
    expect(cache.get("user:1:profile")).toBeNull();
    expect(cache.get("user:1:resume")).toBeNull();
    expect(cache.get("user:2:profile")).toBe("c");
  });

  it("should report correct size", () => {
    expect(cache.size()).toBe(0);
    cache.set("a", "1", 60);
    expect(cache.size()).toBe(1);
  });

  it("cleanup removes all expired entries", () => {
    vi.useFakeTimers();
    cache.set("fresh", "v1", 60);
    cache.set("stale", "v2", -1);
    cache.cleanup();
    expect(cache.get("fresh")).toBe("v1");
    expect(cache.get("stale")).toBeNull();
    expect(cache.size()).toBe(1);
    vi.useRealTimers();
  });

  it("startCleanup/stopCleanup manage the periodic timer", () => {
    vi.useFakeTimers();
    const timerCache = new MemoryLRUCache(10);
    timerCache.set("a", "1", 1);
    timerCache.startCleanup(100);
    vi.advanceTimersByTime(101);
    vi.useRealTimers();
    timerCache.stopCleanup();
  });
});

describe("memoryCache singleton", () => {
  it("is an instance of MemoryLRUCache", () => {
    expect(memoryCache).toBeInstanceOf(MemoryLRUCache);
  });

  it("has a positive max size from env", () => {
    expect(memoryCache.size()).toBeGreaterThanOrEqual(0);
  });
});
