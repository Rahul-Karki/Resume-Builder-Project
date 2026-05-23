// ─── Module: templateController ───────────────────────────
import { describe, it, expect, vi } from "vitest";

vi.mock("../services/templateService", () => ({
  TemplateService: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock("../observability", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("../utils/controllerObservability", () => ({
  startControllerSpan: vi.fn(() => ({})),
  finishControllerSpan: vi.fn(),
  markSpanError: vi.fn(),
  markSpanSuccess: vi.fn(),
}));
vi.mock("../middleware/redisCache", () => ({
  invalidateRedisCache: vi.fn(),
  redisCacheScopes: {
    publicTemplates: "public-templates",
    adminTemplates: "admin-templates",
    adminDashboard: "admin-dashboard",
    adminAnalytics: "admin-analytics",
  },
}));
vi.mock("../models/Template", () => ({ default: {} }));
vi.mock("../models/TemplateUsage", () => ({ default: {} }));

import { listPublicTemplates, createTemplate } from "../controllers/templateController";
import { TemplateService } from "../services/templateService";

function createRes() {
  return {
    statusCode: null as number | null,
    jsonBody: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.jsonBody = body;
      return this;
    },
  };
}

describe("templateController", () => {
  it("listPublicTemplates requests published tech templates", async () => {
    const calls: any[] = [];

    vi.mocked(TemplateService.getAll).mockResolvedValue({
      templates: [{ layoutId: "modern", category: "tech" }],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    const req = { query: { category: "tech", audience: "tech" } } as any;
    const res = createRes() as any;

    await listPublicTemplates(req, res);

    expect(vi.mocked(TemplateService.getAll)).toHaveBeenCalledWith(
      { status: "published", category: "tech", audience: "tech" },
      1,
      50,
    );
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody.ok).toBe(true);
    expect(res.jsonBody.data.templates[0].layoutId).toBe("modern");
  });

  it("createTemplate normalizes tags and tech category fields", async () => {
    const calls: any[] = [];

    vi.mocked(TemplateService.create).mockImplementation(async (dto: any, adminId: string) => {
      calls.push({ dto, adminId });
      return { _id: "template-2", ...dto };
    });

    const req = {
      body: {
        layoutId: "data-scientist",
        name: "Data Scientist",
        category: "tech",
        tag: "SDE",
        tags: ["SDE", "Backend"],
      },
      user: { id: "admin-1" },
    } as any;
    const res = createRes() as any;

    await createTemplate(req, res);

    expect(calls.length).toBe(1);
    expect(calls[0].dto.category).toBe("tech");
    expect(calls[0].dto.audience).toBe("tech");
    expect(calls[0].dto.tags).toEqual(["SDE", "Backend"]);
    expect(calls[0].adminId).toBe("admin-1");
    expect(res.statusCode).toBe(201);
    expect(res.jsonBody.ok).toBe(true);
    expect(res.jsonBody.data.layoutId).toBe("data-scientist");
  });
});
