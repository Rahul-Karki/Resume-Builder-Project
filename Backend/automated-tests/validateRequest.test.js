const test = require("node:test");
const assert = require("node:assert/strict");
const { z } = require("zod");

const { validateRequest } = require("../dist/middleware/validateRequest");

const createRes = () => {
  const data = {
    statusCode: 200,
    body: undefined,
  };

  return {
    data,
    status(code) {
      data.statusCode = code;
      return this;
    },
    json(payload) {
      data.body = payload;
      return this;
    },
  };
};

test("validateRequest calls next and applies parsed body for valid input", () => {
  const middleware = validateRequest({
    body: z.object({
      name: z.string().trim().min(1),
    }),
  });

  const req = { body: { name: "  Rahul  " } };
  const res = createRes();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.data.statusCode, 200);
  assert.equal(req.body.name, "Rahul");
});

test("validateRequest returns 400 with formatted errors for invalid body", () => {
  const middleware = validateRequest({
    body: z.object({
      email: z.string().email(),
    }),
  });

  const req = { body: { email: "not-an-email" } };
  const res = createRes();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.data.statusCode, 400);
  assert.equal(res.data.body.message, "Invalid request payload");
  assert.equal(res.data.body.errorCode, "VALIDATION_ERROR");
  assert.equal(Array.isArray(res.data.body.errors), true);
  assert.equal(res.data.body.errors[0].path, "email");
});

test("validateRequest parses params and query schemas", () => {
  const middleware = validateRequest({
    params: z.object({
      id: z.string().regex(/^[a-f\d]{24}$/i),
    }),
    query: z.object({
      page: z.coerce.number().int().min(1),
    }),
  });

  const req = {
    params: { id: "507f1f77bcf86cd799439011" },
    query: { page: "2" },
  };
  const res = createRes();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.data.statusCode, 200);
  assert.equal(req.query.page, 2);
});
