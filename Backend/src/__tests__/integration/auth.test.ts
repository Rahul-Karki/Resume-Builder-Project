// ─── Module: auth flow integration ───────────────────────────
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;
let app: any;
let Template: any;
let Resume: any;
let closeRedisClient: (() => Promise<void>) | null = null;

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string) =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);

const getTestUser = () => {
  const uniqueSuffix = randomUUID().slice(0, 8);
  return {
    name: `Test User ${uniqueSuffix}`,
    email: `user-${uniqueSuffix}@example.com`,
    password: process.env.TEST_PASSWORD ?? "TestPass@123",
  };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: "resume-builder-integration-tests",
    },
  });

  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);

  const appMod = await import("../../app");
  app = appMod.default;
  const templateMod = await import("../../models/Template");
  Template = templateMod.default;
  const resumeMod = await import("../../models/Resume");
  Resume = resumeMod.default;
  const redisMod = await import("../../utils/redis");
  closeRedisClient = redisMod.closeRedisClient;
}, 30000);

afterAll(async () => {
  if (closeRedisClient) {
    await closeRedisClient();
  }

  await withTimeout(mongoose.disconnect(), 5000, "Mongoose disconnect");

  if (mongoServer) {
    await withTimeout(mongoServer.stop({ doCleanup: true, force: true }), 10000, "Mongo memory server stop");
  }
}, 30000);

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
});

describe("auth integration", () => {
  it("auth signup and login flows work end to end", async () => {
    const user = getTestUser();

    const agent = request.agent(app);
    const signupResponse = await agent
      .post("/api/auth/signup")
      .send(user)
      .expect(201);

    expect(signupResponse.body.user.email).toBe(user.email);
    // Signup doesn't return csrfToken — user must verify email, then login

    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password })
      .expect(200);

    expect(loginResponse.body.user.email).toBe(user.email);
    expect(typeof loginResponse.body.csrfToken).toBe("string");
  }, 30000);

  it("resume CRUD works for an authenticated user", async () => {
    const user = getTestUser();
    const agent = request.agent(app);

    await agent
      .post("/api/auth/signup")
      .send(user)
      .expect(201);

    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password })
      .expect(200);

    const csrfToken = loginResponse.body.csrfToken;
    const userId = loginResponse.body.user.id;
    const layoutId = `integration-template-${randomUUID().slice(0, 8)}`;

    await Template.create({
      layoutId,
      name: "Integration Template",
      description: "Template created by the integration test",
      category: "non-tech",
      audience: "non-tech",
      createdBy: userId,
      updatedBy: userId,
      status: "published",
    });

    const createResponse = await agent
      .post("/api/resumes")
      .set("X-CSRF-Token", csrfToken)
      .send({
        title: "Integration Resume",
        templateId: layoutId,
      })
      .expect(201);

    const resumeId = String(createResponse.body.resume._id ?? createResponse.body.resume.id);

    expect(createResponse.body.message).toBe("Resume saved successfully");
    expect(createResponse.body.resume.title).toBe("Integration Resume");

    const getResponse = await agent
      .get(`/api/resumes/${resumeId}`)
      .expect(200);

    expect(getResponse.body.resume.title).toBe("Integration Resume");

    const updateResponse = await agent
      .put(`/api/resumes/${resumeId}`)
      .set("X-CSRF-Token", csrfToken)
      .send({
        title: "Updated Integration Resume",
        templateId: layoutId,
      })
      .expect(200);

    expect(updateResponse.body.resume.title).toBe("Updated Integration Resume");

    await agent
      .delete(`/api/resumes/${resumeId}`)
      .set("X-CSRF-Token", csrfToken)
      .expect(204);

    const listResponse = await agent
      .get("/api/resumes")
      .expect(200);

    expect(Array.isArray(listResponse.body.resumes)).toBe(true);
    expect(listResponse.body.resumes.length).toBe(0);
    expect(await Resume.countDocuments({ userId })).toBe(0);
  }, 30000);
});
