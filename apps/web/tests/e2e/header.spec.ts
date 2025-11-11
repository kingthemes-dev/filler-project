import { test, expect } from '@playwright/test';

test.describe('Header i menu (smoke)', () => {
  test('header renderuje się na stronie głównej', async ({ page, baseURL }) => {
    await page.goto(`${baseURL || ''}/`, { waitUntil: 'domcontentloaded' });
    // Smoke: istnieje baner/nawigacja (role=banner) lub widoczny przycisk koszyka/ulubionych
    const banner = page.locator('header, [role="banner"]');
    await expect(banner).toBeVisible();
  });

  test('mobilne menu nie powoduje błędów (otwórz/zamknij)', async ({ page, baseURL, isMobile: _isMobile }) => {
    await page.goto(`${baseURL || ''}/`, { waitUntil: 'domcontentloaded' });
    // Próba kliknięcia w przycisk menu jeśli istnieje
    const menuBtn = page.locator('button:has-text("Menu")');
    if (await menuBtn.count()) {
      await menuBtn.first().click();
      await page.waitForTimeout(200);
      const closeBtn = page.locator('button:has-text("Zamknij")');
      if (await closeBtn.count()) {
        await closeBtn.first().click();
      }
    }
    await expect(page).toHaveTitle(/.+/);
  });
});


