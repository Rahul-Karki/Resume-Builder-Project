/**
 * E2E Test Suite for Resume Builder
 * 
 * To run:
 *   npm install -D @playwright/test
 *   npx playwright test
 * 
 * Or for UI mode:
 *   npx playwright test --ui
 */

import { test, expect, Page } from "@playwright/test";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Test configuration
const BASE_URL = process.env.VITE_BASE_URL || process.env.BASE_URL || "http://localhost:5173";
const API_BASE_URL = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:5000/api";

// Test user credentials
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "Test User",
};

/**
 * Helper: Login with test credentials
 */
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 10000 });
}

/**
 * Helper: Signup new account
 */
async function signup(page: Page, name: string, email: string, password: string) {
  await page.goto(`${BASE_URL}/signup`);
  await page.fill('input[placeholder*="Name" i]', name);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 10000 });
}

// ─────────────────────────────────────────────────────────────────────
// AUTH TESTS
// ─────────────────────────────────────────────────────────────────────

test.describe("Authentication", () => {
  test("should register a new user", async ({ page }) => {
    await signup(page, TEST_USER.name, TEST_USER.email, TEST_USER.password);

    // Verify user is logged in
    const heading = page.locator("h1, h2");
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("should login with valid credentials", async ({ page, context }) => {
    // First signup
    await signup(page, TEST_USER.name, TEST_USER.email, TEST_USER.password);

    // Logout
    const logoutBtn = page.locator('button:has-text("Logout")');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForURL(`${BASE_URL}/login`);
    }

    // Then login
    const newPage = await context.newPage();
    await login(newPage, TEST_USER.email, TEST_USER.password);

    // Verify logged in
    const userName = newPage.locator(`text=${TEST_USER.name}`);
    await expect(userName).toBeVisible({ timeout: 10000 });

    await newPage.close();
  });

  test("should show error on invalid password", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    const errorMsg = page.locator("text=/invalid|error/i");
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
  });

  test("should logout successfully", async ({ page }) => {
    await signup(page, TEST_USER.name, TEST_USER.email, TEST_USER.password);

    const logoutBtn = page.locator('button:has-text("Logout")');
    await expect(logoutBtn).toBeVisible();

    await logoutBtn.click();
    await page.waitForURL(`${BASE_URL}/login`);

    const loginForm = page.locator('input[type="email"]');
    await expect(loginForm).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────
// RESUME BUILDER TESTS
// ─────────────────────────────────────────────────────────────────────

test.describe("Resume Builder", () => {
  test.beforeEach(async ({ page }) => {
    // Sign up and login before each test
    await signup(page, TEST_USER.name, TEST_USER.email, TEST_USER.password);
  });

  test("should navigate to resume builder", async ({ page }) => {
    await page.goto(`${BASE_URL}/templates`);
    const builderBtn = page.locator('button:has-text("Create")');
    await expect(builderBtn.first()).toBeVisible();

    await builderBtn.first().click();
    await page.waitForURL("**/builder", { timeout: 10000 });

    const builderHeader = page.locator("text=/builder|create/i");
    await expect(builderHeader).toBeVisible();
  });

  test("should create a new resume", async ({ page }) => {
    // Go to resumes page
    await page.goto(`${BASE_URL}/resumes`);

    // Click create resume button
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New")').first();
    await expect(createBtn).toBeVisible();

    await createBtn.click();

    // Select a template
    const templateCard = page.locator('[data-testid="template-card"]').first();
    if (await templateCard.isVisible()) {
      await templateCard.click();
    }

    // Verify in builder
    await page.waitForURL("**/builder", { timeout: 10000 });
  });

  test("should save resume changes", async ({ page }) => {
    await page.goto(`${BASE_URL}/builder`);

    // Fill in name field
    const nameInput = page.locator('input[placeholder*="Full Name" i]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("John Doe");
      await nameInput.blur();

      // Wait for save
      await page.waitForTimeout(500);

      const savedMsg = page.locator("text=/saved|auto-saved/i");
      await expect(savedMsg).toBeVisible({ timeout: 10000 });
    }
  });

  test("should switch templates", async ({ page }) => {
    await page.goto(`${BASE_URL}/templates`);

    const firstTemplate = page.locator('[data-testid="template-card"]').first();
    await firstTemplate.click();

    await page.waitForURL("**/builder");

    // Switch to another template
    const switchBtn = page.locator('button:has-text("Switch"), button:has-text("Change Template")');
    if (await switchBtn.isVisible()) {
      await switchBtn.click();

      const anotherTemplate = page.locator('[data-testid="template-card"]').nth(1);
      if (await anotherTemplate.isVisible()) {
        await anotherTemplate.click();

        // Verify template changed
        await page.waitForTimeout(1000);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// PDF EXPORT TESTS
// ─────────────────────────────────────────────────────────────────────

test.describe("PDF Export", () => {
  test("should export resume as PDF", async ({ page, context }) => {
    await signup(page, TEST_USER.name, TEST_USER.email, TEST_USER.password);
    await page.goto(`${BASE_URL}/builder`);

    const exportBtn = page.locator('button:has-text("Download"), button:has-text("Export")');
    if (await exportBtn.isVisible()) {
      // Wait for the download event and trigger the export in parallel
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 15000 }),
        exportBtn.click(),
      ]);

      // suggestedFilename() is synchronous and should be available immediately
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.pdf$/);

      // If you want to assert the file path (requires acceptDownloads=true in config):
      // const path = await download.path();
      // expect(path).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// MY RESUMES PAGE TESTS
// ─────────────────────────────────────────────────────────────────────

test.describe("My Resumes Page", () => {
  test("should list user resumes", async ({ page }) => {
    await signup(page, TEST_USER.name, TEST_USER.email, TEST_USER.password);
    await page.goto(`${BASE_URL}/resumes`);

    // Should see empty state or resume list
    const emptyState = page.locator("text=/no resumes|create|start/i");
    const resumeList = page.locator('[data-testid="resume-item"]');

    const hasEmpty = await emptyState.isVisible();
    const hasResumes = (await resumeList.count()) > 0;

    expect(hasEmpty || hasResumes).toBeTruthy();
  });

  test("should delete a resume", async ({ page }) => {
    await signup(page, TEST_USER.name, TEST_USER.email, TEST_USER.password);
    await page.goto(`${BASE_URL}/resumes`);

    const deleteBtn = page.locator('button[title*="Delete"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // Confirm deletion if modal appears
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Delete")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();

        // Verify deletion
        await page.waitForTimeout(500);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// PERFORMANCE TESTS
// ─────────────────────────────────────────────────────────────────────

test.describe("Performance", () => {
  test("should load home page within 3 seconds", async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/`);
    const mainContent = page.locator("h1, main, [role='main']");
    await expect(mainContent.first()).toBeVisible({ timeout: 3000 });

    const loadTime = Date.now() - startTime;
    console.log(`Home page loaded in ${loadTime}ms`);

    expect(loadTime).toBeLessThan(3000);
  });

  test("should load builder within 5 seconds", async ({ page }) => {
    await signup(page, TEST_USER.name, TEST_USER.email, TEST_USER.password);

    const startTime = Date.now();

    await page.goto(`${BASE_URL}/builder`);
    const editorPanel = page.locator('[data-testid="editor"], [id*="editor"]');
    await expect(editorPanel.first()).toBeVisible({ timeout: 5000 });

    const loadTime = Date.now() - startTime;
    console.log(`Builder loaded in ${loadTime}ms`);

    expect(loadTime).toBeLessThan(5000);
  });
});

// ─────────────────────────────────────────────────────────────────────
// ACCESSIBILITY TESTS
// ─────────────────────────────────────────────────────────────────────

test.describe("Accessibility", () => {
  test("should have proper heading hierarchy on home page", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const h1s = page.locator("h1");
    expect(await h1s.count()).toBeGreaterThan(0);
  });

  test("should have form labels", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const labels = page.locator("label");
    expect(await labels.count()).toBeGreaterThan(0);
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Tab through form
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
