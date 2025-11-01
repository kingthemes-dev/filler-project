import { test, expect } from '@playwright/test';

test.describe('Modale (smoke)', () => {
  test('Quick view / Search nie wywala błędów przy otwarciu i zamknięciu', async ({ page, baseURL }) => {
    await page.goto(`${baseURL || ''}/`, { waitUntil: 'domcontentloaded' });

    // Jeśli jest przycisk wyszukiwarki, spróbuj otworzyć modal
    const searchBtn = page.locator('button:has-text("Szukaj")');
    if (await searchBtn.count()) {
      await searchBtn.first().click();
      await page.waitForTimeout(200);
      // zamknij klawiszem ESC
      await page.keyboard.press('Escape');
    }

    // Quick View na liście produktów (jeśli istnieje)
    const quickView = page.locator('button:has-text("Szybki podgląd")');
    if (await quickView.count()) {
      await quickView.first().click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
    }

    await expect(page).toHaveTitle(/.+/);
  });
});


