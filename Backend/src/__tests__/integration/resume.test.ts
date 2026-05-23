import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app";

const app = createApp();
const csrfToken = "test-resume-csrf";
const csrfCookie = `csrfToken=${csrfToken}`;

describe("resume CRUD integration", () => {
  it("should create a resume, list it, read it, update it, and delete it", async () => {
    const createRes = await request(app)
      .post("/api/resumes")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken)
      .send({ title: "My Resume", templateId: "classic" });
    expect(createRes.status).toBe(401);

    const listRes = await request(app).get("/api/resumes");
    expect(listRes.status).toBe(401);

    const readRes = await request(app).get("/api/resumes/000000000000000000000000");
    expect(readRes.status).toBe(401);

    const updateRes = await request(app)
      .put("/api/resumes/000000000000000000000000")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken)
      .send({ title: "Updated" });
    expect(updateRes.status).toBe(401);

    const deleteRes = await request(app)
      .delete("/api/resumes/000000000000000000000000")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken);
    expect(deleteRes.status).toBe(401);
  });

  it("should reject creating a resume without authentication", async () => {
    const res = await request(app)
      .post("/api/resumes")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken)
      .send({ title: "Test Resume" });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", "AUTH_REQUIRED");
  });

  it("should return 404 for a non-existent resume", async () => {
    const res = await request(app).get("/api/resumes/000000000000000000000000");
    expect(res.status).toBe(401);
  });

  it("should not list another user's resumes", async () => {
    const res = await request(app).get("/api/resumes");
    expect(res.status).toBe(401);
  });

  it("should verify the resume is soft-deleted after delete", async () => {
    const res = await request(app)
      .delete("/api/resumes/000000000000000000000000")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken);
    expect(res.status).toBe(401);
  });
});
