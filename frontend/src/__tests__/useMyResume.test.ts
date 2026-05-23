import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useMyResume", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should fetch resumes on mount when the user is authenticated", async () => {
    vi.doMock("@/services/api", () => ({
      api: {
        get: vi.fn()
          .mockResolvedValueOnce({ data: { user: { id: "u1", name: "Test", email: "test@test.com", aiCredits: { remaining: 200 } } } })
          .mockResolvedValueOnce({ data: { resumes: [{ _id: "r1", title: "My Resume", personalInfo: {}, sections: {}, templateId: "classic" }] } }),
      },
    }));
    vi.doMock("@/utils/aiCredits", () => ({ aiCreditsManager: { syncFromServer: vi.fn() } }));
    const { useMyResumes } = await import("../hooks/useMyResume");
    const { renderHook, waitFor } = await import("@testing-library/react");
    const { result } = renderHook(() => useMyResumes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.resumes.length).toBe(1);
  });
  it("should return an empty list when the user has no resumes", async () => {
    vi.doMock("@/services/api", () => ({
      api: {
        get: vi.fn()
          .mockResolvedValueOnce({ data: { user: { id: "u1", name: "Test", email: "test@test.com", aiCredits: { remaining: 200 } } } })
          .mockResolvedValueOnce({ data: { resumes: [] } }),
      },
    }));
    vi.doMock("@/utils/aiCredits", () => ({ aiCreditsManager: { syncFromServer: vi.fn() } }));
    const { useMyResumes } = await import("../hooks/useMyResume");
    const { renderHook, waitFor } = await import("@testing-library/react");
    const { result } = renderHook(() => useMyResumes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.resumes.length).toBe(0);
  });
  it("should calculate the completion score correctly", async () => {
    const { calculateCompletionScore } = await import("../hooks/useMyResume");
    const completeResume = {
      personalInfo: { name: "John", title: "Dev", email: "j@j.com", phone: "123", location: "NY", linkedin: "ln", github: "gh", portfolio: "pf", summary: "Sum" },
      sections: { experience: [{}], education: [{}], skills: [{}], projects: [{}], certifications: [{}] },
    } as any;
    const score = calculateCompletionScore(completeResume);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
    const emptyResume = { personalInfo: {}, sections: {} } as any;
    expect(calculateCompletionScore(emptyResume)).toBe(0);
  });
  it("should map a resume document to a saved resume format", async () => {
    const { mapResumeDocumentToSavedResume } = await import("../hooks/useMyResume");
    const doc = { _id: "r1", title: "Test Resume", personalInfo: { name: "John" }, sections: {}, templateId: "modern", updatedAt: "2026-01-01", createdAt: "2025-12-01" } as any;
    const saved = mapResumeDocumentToSavedResume(doc);
    expect(saved.id).toBe("r1");
    expect(saved.title).toBe("Test Resume");
    expect(saved.templateId).toBe("modern");
  });
  it("should detect auth errors from API responses", async () => {
    const { isAuthError } = await import("../hooks/useMyResume");
    expect(isAuthError({ response: { status: 401 } })).toBe(true);
    expect(isAuthError({ response: { status: 403 } })).toBe(true);
    expect(isAuthError({ response: { status: 200 } })).toBe(false);
    expect(isAuthError(null)).toBe(false);
  });
});
