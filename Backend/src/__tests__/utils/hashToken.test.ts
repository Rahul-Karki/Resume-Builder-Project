// ─── Module: hashToken ───────────────────────────
import { describe, it, expect } from "vitest";
import hashToken from "../../utils/hashToken";

describe("hashToken", () => {
  it("returns deterministic 64-char sha256 hex", () => {
    const token = "reset-token-value";
    const first = hashToken(token);
    const second = hashToken(token);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns different hashes for different values", () => {
    const one = hashToken("token-one");
    const two = hashToken("token-two");

    expect(one).not.toBe(two);
  });
});
