import { test as base, Page, expect } from '@playwright/test';

export async function loginWithEnv(page: Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_EMAIL / E2E_PASSWORD are not set');
  }
  await page.goto('/');
  // Open login modal (adjust selector to your login button)
  const loginBtn = page.locator('[data-testid="open-login"], text=Zaloguj się');
  if (await loginBtn.count()) {
    await loginBtn.first().click();
  } else {
    // Fallback: navigate directly
    await page.goto('/moje-konto');
  }
  // Fill credentials (adjust selectors to your login form)
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Zaloguj")');
  await page.waitForLoadState('networkidle');
  // Expect to be authenticated (e.g., presence of logout button or account header)
  const accountIndicator = page.locator('text=Moje konto');
  await expect(accountIndicator).toBeVisible({ timeout: 10000 });
}

export const test = base.extend<{}>({});
