// ─── Module: cookieParser ───────────────────────────
import { describe, it, expect } from "vitest";
import { parseCookies } from "../../utils/cookieParser";

describe("cookieParser", () => {
  it("returns empty object when cookie header is missing", () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies("")).toEqual({});
  });

  it("decodes keys and values and preserves equals signs", () => {
    const parsed = parseCookies("sessionId=abc123; csrfToken=hello%20world; nested=a%3Db%3Dc");

    expect(parsed).toEqual({
      sessionId: "abc123",
      csrfToken: "hello world",
      nested: "a=b=c",
    });
  });
});
