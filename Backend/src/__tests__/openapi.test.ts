import { describe, it, expect, vi, beforeEach } from "vitest";

describe("openapi", () => {
  it("should export a valid OpenAPI 3.0 specification", async () => {
    const { openAPISpec } = await import("../config/openapi");
    expect(openAPISpec.openapi).toBe("3.0.0");
    expect(openAPISpec.info).toBeDefined();
    expect(openAPISpec.info.version).toBe("1.0.0");
  });
  it("should include all API paths", async () => {
    const { openAPISpec } = await import("../config/openapi");
    expect(openAPISpec.paths).toBeDefined();
    expect(openAPISpec.paths["/auth/signup"]).toBeDefined();
    expect(openAPISpec.paths["/auth/login"]).toBeDefined();
    expect(openAPISpec.paths["/resumes"]).toBeDefined();
    expect(openAPISpec.paths["/templates"]).toBeDefined();
    expect(openAPISpec.paths["/health"]).toBeDefined();
  });
  it("should define all request and response schemas", async () => {
    const { openAPISpec } = await import("../config/openapi");
    expect(openAPISpec.components.schemas.User).toBeDefined();
    expect(openAPISpec.components.schemas.Resume).toBeDefined();
    expect(openAPISpec.components.schemas.Template).toBeDefined();
    expect(openAPISpec.components.schemas.Error).toBeDefined();
  });
});
