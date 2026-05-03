const test = require("node:test");
const assert = require("node:assert/strict");

require("./helpers/setupEnv");

const {
  buildErrorResponse,
  AuthError,
  NotFoundError,
  ValidationError,
} = require("../dist/utils/errorResponse");

test("buildErrorResponse maps validation errors to a structured payload", () => {
  const response = buildErrorResponse(
    new ValidationError("Invalid request payload", [
      { path: "email", message: "Invalid email" },
    ]),
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, "Invalid request payload");
  assert.equal(response.body.errorCode, "VALIDATION_ERROR");
  assert.deepEqual(response.body.errors, [
    { path: "email", message: "Invalid email" },
  ]);
});

test("buildErrorResponse maps not found errors to 404", () => {
  const response = buildErrorResponse(new NotFoundError("Resume not found"));

  assert.equal(response.statusCode, 404);
  assert.equal(response.body.message, "Resume not found");
  assert.equal(response.body.errorCode, "NOT_FOUND");
});

test("buildErrorResponse maps auth errors with explicit codes", () => {
  const response = buildErrorResponse(
    new AuthError("Forbidden", { statusCode: 403, code: "FORBIDDEN" }),
  );

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.message, "Forbidden");
  assert.equal(response.body.errorCode, "FORBIDDEN");
});