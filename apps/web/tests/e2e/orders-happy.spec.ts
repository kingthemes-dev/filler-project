import { test, expect } from '@playwright/test';
import { loginWithEnv } from './utils/auth';

const hasCreds = !!process.env.E2E_EMAIL && !!process.env.E2E_PASSWORD;

test.describe('Orders happy path', () => {
  test.skip(!hasCreds, 'E2E_EMAIL and E2E_PASSWORD must be set to run this test');
  
  test('login and list orders', async ({ page }) => {
    await loginWithEnv(page);
    await page.goto('/moje-zamowienia');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Zamówienia"), h1:has-text("Moje zamówienia")')).toBeVisible();
    // If there are orders, an item card should exist; otherwise, empty state should be visible.
    const anyOrder = page.locator('[data-testid="order-card"], text="Brak zamówień"');
    await expect(anyOrder.first()).toBeVisible({ timeout: 10000 });
  });
});
