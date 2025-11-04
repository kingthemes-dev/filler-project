import { test, expect } from '@playwright/test';

test.describe('Account flows', () => {
  test('redirects unauthenticated users from /moje-konto to home or shows login modal', async ({ page }) => {
    await page.goto('/moje-konto');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const loginModal = page.locator('[data-testid="auth-modal"], [role="dialog"]');

    const modalVisible = await (async () => {
      try { return await loginModal.isVisible(); } catch { return false; }
    })();

    if (modalVisible) {
      expect(await loginModal.isVisible()).toBeTruthy();
    } else {
      expect(url.endsWith('/') || url.endsWith('/index') || url.endsWith('/pl')).toBeTruthy();
    }
  });

  test('wishlist shows loading skeleton', async ({ page }) => {
    await page.goto('/lista-zyczen');
    const skeleton = page.locator('.animate-pulse').first();
    await expect(skeleton).toBeVisible();
  });
});
