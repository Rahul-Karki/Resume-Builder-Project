import { describe, it, expect, beforeEach } from "vitest";
import { MemoryLRUCache } from "../../utils/memoryCache";

describe("memoryCache", () => {
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
});
