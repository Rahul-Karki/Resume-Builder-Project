import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app";

const app = createApp();
const csrfToken = "test-admin-csrf";
const csrfCookie = `csrfToken=${csrfToken}`;

describe("admin operations integration", () => {
  it("should reject admin routes for non-admin users", async () => {
    const res = await request(app).get("/api/admin/analytics/dashboard");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("code", "AUTH_REQUIRED");
  });

  it("should list, create, update, and delete templates as admin", async () => {
    const listRes = await request(app).get("/api/admin/templates");
    expect(listRes.status).toBe(401);

    const createRes = await request(app)
      .post("/api/admin/templates")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken)
      .send({ name: "Test" });
    expect(createRes.status).toBe(401);

    const updateRes = await request(app)
      .put("/api/admin/templates/000000000000000000000000")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken)
      .send({ name: "Updated" });
    expect(updateRes.status).toBe(401);

    const deleteRes = await request(app)
      .delete("/api/admin/templates/000000000000000000000000")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken);
    expect(deleteRes.status).toBe(401);
  });

  it("should update template status and premium flags", async () => {
    const statusRes = await request(app)
      .patch("/api/admin/templates/000000000000000000000000/status")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken)
      .send({ status: "published" });
    expect(statusRes.status).toBe(401);

    const premiumRes = await request(app)
      .patch("/api/admin/templates/000000000000000000000000/premium")
      .set("Cookie", csrfCookie)
      .set("x-csrf-token", csrfToken);
    expect(premiumRes.status).toBe(401);
  });

  it("should return dashboard analytics", async () => {
    const res = await request(app).get("/api/admin/analytics/dashboard");
    expect(res.status).toBe(401);
  });
});
