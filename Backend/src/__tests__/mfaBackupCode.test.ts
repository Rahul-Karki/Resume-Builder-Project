import { describe, it, expect } from "vitest";

describe("MFA backup code hashing", () => {
  it("hashBackupCode produces a salted scrypt hash", async () => {
    const mod = await import("../controllers/mfaController");
    const { hashBackupCode } = mod as any;

    const hashed = hashBackupCode("ABCD-1234");
    expect(hashed).toContain(":");
    const [salt, hash] = hashed.split(":");
    expect(salt.length).toBe(32);
    expect(hash.length).toBe(128);
  });

  it("same code produces different hashes each time", async () => {
    const mod = await import("../controllers/mfaController");
    const { hashBackupCode } = mod as any;

    const h1 = hashBackupCode("SAME-CODE");
    const h2 = hashBackupCode("SAME-CODE");
    expect(h1).not.toBe(h2);
  });

  it("verifyBackupCode validates correct code", async () => {
    const mod = await import("../controllers/mfaController");
    const { hashBackupCode, verifyBackupCode } = mod as any;

    const code = "WXYZ-9876";
    const hashed = hashBackupCode(code);
    expect(verifyBackupCode(code, hashed)).toBe(true);
  });

  it("verifyBackupCode rejects incorrect code", async () => {
    const mod = await import("../controllers/mfaController");
    const { hashBackupCode, verifyBackupCode } = mod as any;

    const hashed = hashBackupCode("REAL-CODE");
    expect(verifyBackupCode("FAKE-CODE", hashed)).toBe(false);
  });

  it("verifyBackupCode returns false for malformed hash", async () => {
    const mod = await import("../controllers/mfaController");
    const { verifyBackupCode } = mod as any;

    expect(verifyBackupCode("ANY-CODE", "just-a-plain-hash")).toBe(false);
    expect(verifyBackupCode("ANY-CODE", "")).toBe(false);
  });
});
