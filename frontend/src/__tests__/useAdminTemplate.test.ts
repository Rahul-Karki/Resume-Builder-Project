import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/services/api", () => ({ api: mockApi }));

describe("useAdminTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the template list on fetchTemplates", async () => {
    mockApi.get.mockResolvedValue({ data: { ok: true, data: [{ _id: "1", name: "T1" }] } });
    const { useAdminTemplates } = await import("../hooks/useAdminTemplate");
    const { result } = renderHook(() => useAdminTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.templates.length).toBeGreaterThan(0);
  });
  it("should add a template to the list on createTemplate success", async () => {
    mockApi.get.mockResolvedValue({ data: { ok: true, data: [] } });
    mockApi.post.mockResolvedValue({ data: { ok: true, data: { _id: "2", name: "New Template" } } });
    const { useAdminTemplates } = await import("../hooks/useAdminTemplate");
    const { result } = renderHook(() => useAdminTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.createTemplate({ name: "New Template" } as any); });
    expect(result.current.templates.length).toBe(1);
  });
  it("should update the template in the list on updateTemplate success", async () => {
    mockApi.get.mockResolvedValue({ data: { ok: true, data: [{ _id: "1", name: "Old" }] } });
    mockApi.put.mockResolvedValue({ data: { ok: true, data: { _id: "1", name: "Updated" } } });
    const { useAdminTemplates } = await import("../hooks/useAdminTemplate");
    const { result } = renderHook(() => useAdminTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.updateTemplate("1", { name: "Updated" } as any); });
    expect(result.current.templates[0].name).toBe("Updated");
  });
  it("should remove the template from the list on deleteTemplate success", async () => {
    mockApi.get.mockResolvedValue({ data: { ok: true, data: [{ _id: "1", name: "ToDelete" }] } });
    mockApi.delete.mockResolvedValue({ data: { ok: true } });
    const { useAdminTemplates } = await import("../hooks/useAdminTemplate");
    const { result } = renderHook(() => useAdminTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.deleteTemplate("1"); });
    expect(result.current.templates.length).toBe(0);
  });
  it("should update template status when setStatus is called", async () => {
    mockApi.get.mockResolvedValue({ data: { ok: true, data: [{ _id: "1", name: "T1", status: "draft" }] } });
    mockApi.patch.mockResolvedValue({ data: { ok: true, data: { _id: "1", name: "T1", status: "published" } } });
    const { useAdminTemplates } = await import("../hooks/useAdminTemplate");
    const { result } = renderHook(() => useAdminTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.setStatus("1", "published"); });
    expect(result.current.templates[0].status).toBe("published");
  });
  it("should set loading and error states correctly", async () => {
    mockApi.get.mockRejectedValue(new Error("Network error"));
    const { useAdminTemplates } = await import("../hooks/useAdminTemplate");
    const { result } = renderHook(() => useAdminTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
