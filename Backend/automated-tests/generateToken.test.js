const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

require("./helpers/setupEnv");

const { generateAccessToken, generateRefreshToken } = require("../dist/utils/generateToken");

test("generateAccessToken signs token with access secret", () => {
  const userId = "user-123";
  const token = generateAccessToken(userId);
  const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

  assert.equal(payload.userId, userId);
  assert.ok(payload.exp > payload.iat);
});

test("generateRefreshToken signs token with refresh secret and long ttl", () => {
  const userId = "user-abc";
  const token = generateRefreshToken(userId);
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

  assert.equal(payload.userId, userId);
  assert.ok(payload.exp > payload.iat);

  const ttlSeconds = payload.exp - payload.iat;
  assert.ok(ttlSeconds >= 6 * 24 * 60 * 60);
});
