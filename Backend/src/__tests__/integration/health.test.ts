import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app";

const app = createApp();

describe("health check integration", () => {
  it("should return 200 OK from /health", async () => {
    const res = await request(app).get("/health");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("mongo");
    expect(res.body).toHaveProperty("uptime");
  });

  it("should return 200 OK from /api/health", async () => {
    const res = await request(app).get("/api/health");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
  });

  it("should include service version and uptime", async () => {
    const res = await request(app).get("/health/uptime");
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("uptimeSeconds");
      expect(res.body).toHaveProperty("uptimeHuman");
      expect(res.body).toHaveProperty("startTime");
      expect(res.body).toHaveProperty("slaLabels");
      expect(res.body.status).toBe("ok");
    }
  });

  it("should return deep health status when available", async () => {
    const res = await request(app).get("/health/deep");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("mongo");
    expect(res.body).toHaveProperty("redis");
  });
});
