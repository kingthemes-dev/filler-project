import { test, expect } from '@playwright/test';

test.describe('Strona produktu (smoke)', () => {
  test('wejście na przykładowy produkt i próba dodania do koszyka', async ({ page, baseURL }) => {
    // Jeśli nie znamy sluga, sprawdź najpierw listę i kliknij pierwszą kartę
    await page.goto(`${baseURL || ''}/sklep`, { waitUntil: 'domcontentloaded' });

    // Kliknij pierwszy link do produktu
    const firstCard = page.locator('a[href*="/produkt/"]').first();
    if (await firstCard.count()) {
      await firstCard.click();
      await expect(page).toHaveURL(/.*\/produkt\//);
      const addToCart = page.locator('button[data-testid="add-to-cart-button"]').first();
      if (await addToCart.count()) {
        await addToCart.click();
        await page.waitForTimeout(300);
      }
    } else {
      test.fixme(true, 'Brak kart produktu na liście – pominieto');
    }
  });
});


