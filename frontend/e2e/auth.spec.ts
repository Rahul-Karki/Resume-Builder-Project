import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should load the login page and show form", async ({ page }) => {
    // Navigate to the root, which should either be landing or redirect to login
    await page.goto("/login");

    // Check if the login form is present
    const loginHeader = page.locator("h1");
    await expect(loginHeader).toContainText(/Sign In|Log In|Login|Welcome/i);

    // Check for email and password inputs
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    
    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test("should display validation errors on empty submission", async ({ page }) => {
    await page.goto("/login");

    // Click submit without entering data
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check if validation messages appear (adjust selector based on your UI library)
    // Most forms will show some required text
    const formBody = page.locator("form");
    await expect(formBody).toContainText(/Required|Invalid|Please enter/i);
  });
});
