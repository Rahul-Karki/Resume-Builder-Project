import { test, expect } from "@playwright/test";

test("templates page groups templates into tech and non-tech sections", async ({ page }) => {
  await page.goto("/templates");

  await expect(page.getByRole("button", { name: "All" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Non-Tech" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tech" })).toBeVisible();

  await expect(page.getByText("Non-Tech Only")).toBeVisible();
  await expect(page.getByText("Tech Templates")).toBeVisible();
});

test("templates page can switch to tech-only filtering", async ({ page }) => {
  await page.goto("/templates");

  await page.getByRole("button", { name: "Tech" }).click();

  await expect(page.getByRole("button", { name: "Tech" })).toHaveClass(/active/);
  await expect(page.getByText("Tech Templates")).toBeVisible();
});
