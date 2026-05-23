import { describe, it, expect, vi, beforeEach } from "vitest";
import { deduplicationMiddleware } from "../middleware/requestDeduplication";
import { cacheGet, cacheSet } from "../utils/redis";

vi.mock("../utils/redis", () => ({ cacheGet: vi.fn(), cacheSet: vi.fn() }));
vi.mock("../utils/hashUtils", () => ({ createTextHash: vi.fn((s) => "hash-"+s) }));

describe("requestDeduplicationMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return cached response when the same request is repeated within the window", async () => {
    const cachedData = JSON.stringify({ result: "cached" });
    vi.mocked(cacheGet).mockResolvedValue(cachedData);

    const req = { path: "/api/ai/improve-text", headers: {}, user: { id: "user1" }, body: { text: "hello" } } as any;
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    await deduplicationMiddleware()(req, res, next);

    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ "X-Cache": "HIT" }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result: "cached" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should forward the request to the handler when the hash is new", async () => {
    vi.mocked(cacheGet).mockResolvedValue(null);

    const req = { path: "/api/ai/improve-text", headers: {}, user: { id: "user1" }, body: { text: "new content" } } as any;
    const res = { json: vi.fn((body) => body), set: vi.fn(), statusCode: 200 } as any;
    const next = vi.fn();

    await deduplicationMiddleware()(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should use a combination of user ID and content for the dedup key", async () => {
    vi.mocked(cacheGet).mockResolvedValue(null);

    const req = { path: "/api/ai/improve-text", headers: {}, user: { id: "user1" }, body: { text: "my text", section: "summary", tone: "professional" } } as any;
    const res = { json: vi.fn((body) => body), set: vi.fn(), statusCode: 200 } as any;
    const next = vi.fn();

    await deduplicationMiddleware()(req, res, next);

    expect(cacheGet).toHaveBeenCalledWith(
      expect.stringContaining("user1")
    );
  });
});
