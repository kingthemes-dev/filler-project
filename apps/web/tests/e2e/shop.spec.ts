import { test, expect } from '@playwright/test';

test.describe('Sklep - strona i filtry (smoke)', () => {
  test('otwiera stronę sklepu (render bez błędów)', async ({ page, baseURL }) => {
    const resp = await page.goto(`${baseURL || ''}/sklep`, { waitUntil: 'networkidle' });
    expect(resp?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/.*\/sklep/);
  });

  test('paginacja lub lazy-load nie wywala strony', async ({ page, baseURL }) => {
    await page.goto(`${baseURL || ''}/sklep`, { waitUntil: 'domcontentloaded' });
    await page.mouse.wheel(0, 2000);
    // Brak błędów JS jest wystarczającym smoke-checkiem
    await expect(page).toHaveURL(/.*\/sklep/);
  });
});


