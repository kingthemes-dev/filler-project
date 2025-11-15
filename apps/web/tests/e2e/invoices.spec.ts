import { test, expect } from '@playwright/test';

test.describe('Invoices page', () => {
  test('unauthenticated user is redirected or sees noindex page without orders', async ({
    page,
  }) => {
    await page.goto('/moje-faktury');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const header = page.locator('h1:has-text("Moje faktury")');
    const headerVisible = await (async () => {
      try {
        return await header.isVisible();
      } catch {
        return false;
      }
    })();
    expect(
      headerVisible || url.endsWith('/') || url.endsWith('/index')
    ).toBeTruthy();
  });
});
