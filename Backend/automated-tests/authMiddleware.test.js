const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("./helpers/setupEnv");

const { loadWithMocks } = require("./helpers/mockModule");

const distRoot = path.join(__dirname, "..", "dist");
const authMiddlewarePath = path.join(distRoot, "middleware", "authMiddleware.js");
const cookieParserPath = path.join(distRoot, "utils", "cookieParser.js");
const userModelPath = path.join(distRoot, "models", "User.js");

function createRes() {
  return {
    statusCode: null,
    jsonBody: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.jsonBody = body;
      return this;
    },
  };
}

function loadAuthMiddleware(overrides = {}) {
  return loadWithMocks(authMiddlewarePath, {
    [cookieParserPath]: {
      parseCookies: overrides.parseCookies ?? (() => ({ accessToken: "access-token" })),
    },
    [userModelPath]: {
      findById: overrides.findById ?? (() => ({
        select() {
          return {
            lean() {
              return Promise.resolve({
                _id: "user-123",
                role: "admin",
                name: "Rahul",
              });
            },
          };
        },
      })),
    },
    jsonwebtoken: {
      verify: overrides.verify ?? (() => ({ userId: "user-123" })),
    },
  });
}

test("authMiddleware returns 401 when no access token cookie is present", () => {
  const { authMiddleware } = loadAuthMiddleware({
    parseCookies: () => ({}),
  });

  const req = {
    headers: {},
  };
  const res = createRes();
  let nextCalled = false;

  authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.jsonBody, { message: "Unauthorized: No token provided", errorCode: "AUTH_REQUIRED" });
});

test("authMiddleware attaches the current user when the token is valid", async () => {
  const { authMiddleware } = loadAuthMiddleware({
    parseCookies: () => ({ accessToken: "access-token" }),
    verify: (token, secret) => {
      assert.equal(token, "access-token");
      assert.equal(typeof secret, "string");
      return { userId: "user-123" };
    },
  });

  const req = {
    headers: {
      cookie: "accessToken=access-token",
    },
  };
  const res = createRes();
  let nextCalled = false;

  authMiddleware(req, res, () => {
    nextCalled = true;
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
  assert.deepEqual(req.user, {
    id: "user-123",
    role: "admin",
    name: "Rahul",
  });
});

test("authMiddleware returns 401 when the user cannot be found", async () => {
  const { authMiddleware } = loadAuthMiddleware({
    parseCookies: () => ({ accessToken: "access-token" }),
    findById: () => ({
      select() {
        return {
          lean() {
            return Promise.resolve(null);
          },
        };
      },
    }),
  });

  const req = {
    headers: {
      cookie: "accessToken=access-token",
    },
  };
  const res = createRes();
  let nextCalled = false;

  authMiddleware(req, res, () => {
    nextCalled = true;
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.jsonBody, { message: "Unauthorized: User not found", errorCode: "AUTH_REQUIRED" });
});

test("authMiddleware returns 401 when token verification fails", () => {
  const { authMiddleware } = loadAuthMiddleware({
    verify: () => {
      throw new Error("invalid token");
    },
  });

  const req = {
    headers: {
      cookie: "accessToken=access-token",
    },
  };
  const res = createRes();
  let nextCalled = false;

  authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.jsonBody, { message: "Unauthorized: Invalid token", errorCode: "AUTH_REQUIRED" });
});