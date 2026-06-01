import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app";

const app = createApp();
const csrfToken = "test-ai-csrf";
const csrfCookie = `csrfToken=${csrfToken}`;

describe("AI features integration", () => {
  it("should improve text via the AI endpoint", async () => {
    const res = await request(app)
      .post("/api/ai/improve-text")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken)
      .send({ text: "Improve this sentence" });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("code", "AUTH_REQUIRED");
  });

  it("should analyze ATS and return a score", async () => {
    const res = await request(app)
      .post("/api/resumes/000000000000000000000000/analyze-ats")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", "AUTH_REQUIRED");
  });

  it("should reject AI requests without authentication", async () => {
    const res = await request(app)
      .post("/api/ai/improve-text")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken)
      .send({ text: "Some text" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_REQUIRED");
  });

  it("should reject excessively long input text", async () => {
    const longText = "a".repeat(10001);
    const res = await request(app)
      .post("/api/ai/improve-text")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken)
      .send({ text: longText });
    expect(res.status).toBe(401);
  });
});
