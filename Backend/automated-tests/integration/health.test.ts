import { describe, it } from "node:test";
import assert from "node:assert";
import request from "supertest";
import { createApp } from "../../src/app";

describe("Health Check API", () => {
  it("should return 200 OK from /health", async () => {
    const app = createApp();
    const response = await request(app).get("/health");
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.status, "ok");
  });

  it("should return 200 OK from /api/health", async () => {
    const app = createApp();
    const response = await request(app).get("/api/health");
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.status, "ok");
  });
});
