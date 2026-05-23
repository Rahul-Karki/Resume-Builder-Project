import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import { consumeRateLimit } from "../utils/redis";

vi.mock("../utils/redis", () => ({ consumeRateLimit: vi.fn() }));

describe("redisRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow requests within the configured limit", async () => {
    vi.mocked(consumeRateLimit).mockResolvedValue({ count: 1, ttlSeconds: 60 });

    const req = { user: { id: "user1" }, ip: "127.0.0.1" } as any;
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    const middleware = createRedisRateLimitMiddleware({ scope: "test", windowMs: 60000, max: 10 });
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 429 when the limit is exceeded", async () => {
    vi.mocked(consumeRateLimit).mockResolvedValue({ count: 11, ttlSeconds: 60 });

    const req = { user: { id: "user1" }, ip: "127.0.0.1" } as any;
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    const middleware = createRedisRateLimitMiddleware({ scope: "test", windowMs: 60000, max: 10 });
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it("should include Retry-After headers on 429 responses", async () => {
    vi.mocked(consumeRateLimit).mockResolvedValue({ count: 11, ttlSeconds: 45 });

    const req = { user: { id: "user1" }, ip: "127.0.0.1" } as any;
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    const middleware = createRedisRateLimitMiddleware({ scope: "test", windowMs: 60000, max: 10 });
    await middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "45");
  });

  it("should use user ID when available, falling back to IP", async () => {
    vi.mocked(consumeRateLimit).mockResolvedValue({ count: 1, ttlSeconds: 60 });

    const req = { ip: "10.0.0.1" } as any;
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    const middleware = createRedisRateLimitMiddleware({ scope: "test", windowMs: 60000, max: 10 });
    await middleware(req, res, next);

    expect(consumeRateLimit).toHaveBeenCalledOnce();
    const key = consumeRateLimit.mock.calls[0][0];
    expect(key).toContain("resume-builder:rate-limit:test:");
    expect(next).toHaveBeenCalled();
  });

  it("should reset the window after the configured duration", async () => {
    vi.mocked(consumeRateLimit).mockResolvedValue({ count: 0, ttlSeconds: 0 });

    const req = { user: { id: "user1" }, ip: "127.0.0.1" } as any;
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    const middleware = createRedisRateLimitMiddleware({ scope: "test", windowMs: 60000, max: 10 });
    await middleware(req, res, next);

    expect(consumeRateLimit).toHaveBeenCalledWith(expect.any(String), 60);
    expect(next).toHaveBeenCalled();
  });
});
