const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

require("../helpers/setupEnv");

let mongoServer;
let app;
let Template;
let Resume;
let PendingUser;
let closeRedisClient;

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
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

test.before(async () => {
  process.env.NODE_ENV = "test";

  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: "resume-builder-integration-tests",
    },
  });

  process.env.MONGO_URI = mongoServer.getUri();

  await mongoose.connect(process.env.MONGO_URI);

  ({ default: app } = require("../../dist/Backend/src/app"));
  ({ default: Template } = require("../../dist/Backend/src/models/Template"));
  ({ default: Resume } = require("../../dist/Backend/src/models/Resume"));
  ({ default: PendingUser } = require("../../dist/Backend/src/models/PendingUser"));
  ({ closeRedisClient } = require("../../dist/Backend/src/utils/redis"));
});

test.after(async () => {
  if (closeRedisClient) {
    await closeRedisClient();
  }

  await withTimeout(mongoose.disconnect(), 5000, "Mongoose disconnect");

  if (mongoServer) {
    await withTimeout(mongoServer.stop({ doCleanup: true, force: true }), 10000, "Mongo memory server stop");
  }
});

test.beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

test("auth signup and login flows work end to end", async () => {
  const user = getTestUser();

  // Step 1: Signup creates a pending registration and sends OTP
  await request(app)
    .post("/api/auth/signup")
    .send(user)
    .expect(201);

  // Step 2: Retrieve the OTP from the pending user document
  const pending = await PendingUser.findOne({ email: user.email });
  assert.ok(pending, "PendingUser should exist after signup");
  const otp = pending.emailVerificationOtp;
  assert.ok(otp, "OTP should be generated");

  // Step 3: Verify email with the OTP
  const verifyResponse = await request(app)
    .post("/api/auth/verify-email")
    .send({ email: user.email, otp })
    .expect(200);

  assert.equal(verifyResponse.body.user.email, user.email);
  assert.equal(verifyResponse.body.user.emailVerified, true);

  // Step 4: Login should now work
  const loginAgent = request.agent(app);
  const loginResponse = await loginAgent
    .post("/api/auth/login")
    .send({ email: user.email, password: user.password })
    .expect(200);

  assert.equal(loginResponse.body.user.email, user.email);
  assert.equal(typeof loginResponse.body.csrfToken, "string");
});

test("resume CRUD works for an authenticated user", async () => {
  const user = getTestUser();
  const agent = request.agent(app);

  await agent
    .post("/api/auth/signup")
    .send(user)
    .expect(201);

  // Retrieve OTP from pending user and verify email
  const pending = await PendingUser.findOne({ email: user.email });
  assert.ok(pending, "PendingUser should exist after signup");
  const otp = pending.emailVerificationOtp;
  assert.ok(otp, "OTP should be generated");

  await agent
    .post("/api/auth/verify-email")
    .send({ email: user.email, otp })
    .expect(200);

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

  assert.equal(createResponse.body.message, "Resume saved successfully");
  assert.equal(createResponse.body.resume.title, "Integration Resume");

  const getResponse = await agent
    .get(`/api/resumes/${resumeId}`)
    .expect(200);

  assert.equal(getResponse.body.resume.title, "Integration Resume");

  const updateResponse = await agent
    .put(`/api/resumes/${resumeId}`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      title: "Updated Integration Resume",
      templateId: layoutId,
    })
    .expect(200);

  assert.equal(updateResponse.body.resume.title, "Updated Integration Resume");

  await agent
    .delete(`/api/resumes/${resumeId}`)
    .set("X-CSRF-Token", csrfToken)
    .expect(204);

  const listResponse = await agent
    .get("/api/resumes")
    .expect(200);

  assert.equal(Array.isArray(listResponse.body.resumes), true);
  assert.equal(listResponse.body.resumes.length, 0);
  assert.equal(await Resume.countDocuments({ userId }), 0);
});
