import { expect, test, type Page } from "@playwright/test";

const adminTemplates = {
  ok: true,
  data: [
    {
      _id: "template-1",
      layoutId: "classic",
      name: "Classic",
      description: "Clean serif template",
      category: "non-tech",
      audience: "non-tech",
      tag: "Timeless",
      tags: ["Timeless"],
      thumbnailUrl: "",
      status: "published",
      isPremium: false,
      sortOrder: 10,
      cssVars: {
        accentColor: "#1a1a1a",
        headingColor: "#111111",
        textColor: "#333333",
        mutedColor: "#666666",
        borderColor: "#cccccc",
        backgroundColor: "#ffffff",
        bodyFont: "EB Garamond, serif",
        headingFont: "EB Garamond, serif",
        fontSize: "10.5pt",
        lineHeight: "1.5",
      },
      slots: {
        summary: true,
        experience: true,
        education: true,
        skills: true,
        projects: true,
        certifications: true,
        languages: false,
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      publishedAt: null,
    },
  ],
};

const adminAnalytics = {
  ok: true,
  data: [
    {
      templateId: "template-1",
      layoutId: "classic",
      name: "Classic",
      status: "published",
      totalUses: 15,
      weeklyUses: 4,
      monthlyUses: 15,
      daily: [],
      trend: "stable",
    },
  ],
};

async function setupAdminRoutes(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("accessToken", "session");
  });

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ json: { user: { role: "admin" } } });
  });

  await page.route("**/api/admin/templates", async (route) => {
    await route.fulfill({ json: adminTemplates });
  });

  await page.route("**/api/admin/analytics/templates*", async (route) => {
    await route.fulfill({ json: adminAnalytics });
  });
}

test.describe("Admin responsive layout", () => {
  test("keeps the Templates navigation visible on desktop", async ({ page }) => {
    await setupAdminRoutes(page);
    await page.goto("/admin");

    const templatesNav = page.locator("aside").getByRole("button", { name: "Templates" });
    await expect(templatesNav).toBeVisible();

    await templatesNav.click();
    await expect(page).toHaveURL(/\/admin\/templates$/);
    await expect(page.getByRole("button", { name: "Preview" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Preview" }).first().click();
    await expect(page.getByText("Template Details")).toBeVisible();
    await expect(page.getByText("layoutId: classic")).toBeVisible();

    const canvas = page.getByTestId("admin-template-preview-canvas");
    await expect(canvas).toBeVisible();
    const transform = await canvas.evaluate((element) => getComputedStyle(element).transform);
    expect(transform).not.toBe("none");
  });
});

test.describe("Admin responsive layout on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows the Templates navigation on mobile without horizontal overflow", async ({ page }) => {
    await setupAdminRoutes(page);
    await page.goto("/admin");

    const templatesNav = page.locator("aside").getByRole("button", { name: "Templates" });
    await expect(templatesNav).toBeVisible();
    await templatesNav.click();
    await expect(page).toHaveURL(/\/admin\/templates$/);
    await expect(page.getByRole("button", { name: "Preview" }).first()).toBeVisible();
  });
});