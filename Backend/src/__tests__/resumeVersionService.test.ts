import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../models/ResumeVersion", () => {
  const mock = {
    findOne: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
  };
  return { default: mock, __mock: mock };
});

import ResumeVersion from "../models/ResumeVersion";
import { createResumeVersion } from "../services/resumeVersionService";

function chainFindOne(value: any) {
  const chain: any = { sort: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(value) };
  chain.sort = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.lean = vi.fn(() => Promise.resolve(value));
  (ResumeVersion as any).findOne.mockReturnValue(chain);
  return chain;
}

describe("resumeVersionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create version 1 when no prior version exists", async () => {
    chainFindOne(null);

    const versionNo = await createResumeVersion(
      { _id: "resume-1", userId: "user-1" } as any,
      "Initial version",
    );

    expect(versionNo).toBe(1);
    expect(ResumeVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ resumeId: "resume-1", versionNo: 1, note: "Initial version" }),
    );
  });

  it("should increment version number", async () => {
    chainFindOne({ versionNo: 3 });

    const versionNo = await createResumeVersion(
      { _id: "resume-1", userId: "user-1" } as any,
    );

    expect(versionNo).toBe(4);
    expect(ResumeVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ resumeId: "resume-1", versionNo: 4 }),
    );
  });

  it("should use toObject when available on resume", async () => {
    chainFindOne(null);

    const toObject = vi.fn(() => ({ title: "Snapshot", name: "John" }));
    await createResumeVersion(
      { _id: "resume-1", userId: "user-1", toObject } as any,
    );

    expect(toObject).toHaveBeenCalled();
    expect(ResumeVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: { title: "Snapshot", name: "John" },
      }),
    );
  });

  it("should spread resume when toObject is unavailable", async () => {
    chainFindOne(null);

    const resume = { _id: "resume-1", userId: "user-1", title: "My Resume" };
    await createResumeVersion(resume as any);

    expect(ResumeVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: { _id: "resume-1", userId: "user-1", title: "My Resume" },
      }),
    );
  });
});
