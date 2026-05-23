import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRateLimiter } from "../../utils/memoryRateLimit";

describe("memoryRateLimit", () => {
  let limiter: MemoryRateLimiter;

  beforeEach(() => {
    limiter = new MemoryRateLimiter();
  });

  afterEach(() => {
    limiter.destroy();
  });

  it("should allow requests within the configured limit", () => {
    const result = limiter.consume("test-key", 60000);
    expect(result.count).toBe(1);
  });

  it("should reject requests that exceed the limit", () => {
    limiter.consume("test-key", 60000);
    const result = limiter.consume("test-key", 60000);
    expect(result.count).toBe(2);
  });

  it("should reset after the configured window", () => {
    const result1 = limiter.consume("test-key", 0);
    const result2 = limiter.consume("test-key", 0);
    expect(result1.count).toBe(1);
    expect(result2.count).toBe(1);
  });

  it("should return remaining count on each consume", () => {
    const r1 = limiter.consume("test-key", 60000);
    expect(r1.count).toBe(1);
    expect(r1.ttlSeconds).toBeGreaterThan(0);
    const r2 = limiter.consume("test-key", 60000);
    expect(r2.count).toBe(2);
  });
});
