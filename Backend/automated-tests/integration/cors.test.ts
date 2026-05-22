import "../helpers/setupEnv";
import { describe, it } from "node:test";
import assert from "node:assert";
import request from "supertest";
import { createApp } from "../../src/app";

const frontendOrigin = "https://resume-builder-project-3h9o.vercel.app";

describe("CORS integration", () => {
  it("returns CORS headers for the AI preflight request", async () => {
    const app = createApp();

    const response = await request(app)
      .options("/api/ai/improve-text")
      .set("Origin", frontendOrigin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,x-csrf-token,x-request-id");

    assert.strictEqual(response.status, 204);
    assert.strictEqual(response.headers["access-control-allow-origin"], frontendOrigin);
    assert.strictEqual(response.headers["access-control-allow-credentials"], "true");
  });

  it("keeps CORS headers on an unauthenticated AI request", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/ai/improve-text")
      .set("Origin", frontendOrigin)
      .set("Content-Type", "application/json")
      .set("X-CSRF-Token", "test-token")
      .send({ text: "test", section: "experience" });

    assert.strictEqual(response.status, 403);
    assert.strictEqual(response.headers["access-control-allow-origin"], frontendOrigin);
    assert.strictEqual(response.headers["access-control-allow-credentials"], "true");
  });
});