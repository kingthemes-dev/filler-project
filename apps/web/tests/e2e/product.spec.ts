import { test, expect } from '@playwright/test';

test.describe('Product Page E2E Tests', () => {
  test('should navigate to a product, select capacity, and add to cart', async ({ page }) => {
    await page.goto('/sklep');

    // Wait for products to load and click on the first product
    await page.waitForSelector('[data-testid="product-card"]');
    await page.click('[data-testid="product-card"] a');

    // Ensure we are on the product page
    await page.waitForURL(/\/produkt\/.+/);
    await expect(page.locator('h1')).toBeVisible();

    // Check if capacity selector exists and select an option if it does
    const capacitySelect = page.locator('#capacity-select');
    if (await capacitySelect.isVisible()) {
      await capacitySelect.selectOption({ index: 1 }); // Select the second option
      await expect(capacitySelect).toHaveValue(await capacitySelect.evaluate(el => (el as HTMLSelectElement).options[1].value));
    }

    // Click "Dodaj do koszyka" button
    const addToCartButton = page.locator('button:has-text("Dodaj do koszyka")');
    await expect(addToCartButton).toBeEnabled();
    await addToCartButton.click();

    // Verify cart is open and item is added
    await page.waitForSelector('[data-testid="cart-drawer"]', { state: 'visible' });
    await expect(page.locator('[data-testid="cart-drawer"]')).toBeVisible();
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
    await expect(page.locator('[data-testid="cart-item-count"]')).toHaveText('1');
  });

  test('should display product information correctly', async ({ page }) => {
    await page.goto('/sklep');
    await page.waitForSelector('[data-testid="product-card"]');
    await page.click('[data-testid="product-card"] a');

    await page.waitForURL(/\/produkt\/.+/);
    
    // Check product title
    await expect(page.locator('h1')).toBeVisible();
    
    // Check price is displayed
    await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
    
    // Check product images
    await expect(page.locator('[data-testid="product-image"]')).toBeVisible();
    
    // Check add to cart button
    await expect(page.locator('button:has-text("Dodaj do koszyka")')).toBeVisible();
  });

  test('should handle product tabs navigation', async ({ page }) => {
    await page.goto('/sklep');
    await page.waitForSelector('[data-testid="product-card"]');
    await page.click('[data-testid="product-card"] a');

    await page.waitForURL(/\/produkt\/.+/);
    
    // Test tab navigation
    const descriptionTab = page.locator('[role="tab"]:has-text("Opis produktu")');
    const reviewsTab = page.locator('[role="tab"]:has-text("Opinie")');
    const shippingTab = page.locator('[role="tab"]:has-text("Dostawa i zwroty")');

    if (await descriptionTab.isVisible()) {
      await descriptionTab.click();
      await expect(descriptionTab).toHaveAttribute('aria-selected', 'true');
    }

    if (await reviewsTab.isVisible()) {
      await reviewsTab.click();
      await expect(reviewsTab).toHaveAttribute('aria-selected', 'true');
    }

    if (await shippingTab.isVisible()) {
      await shippingTab.click();
      await expect(shippingTab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('should handle product variations selection', async ({ page }) => {
    await page.goto('/sklep');
    await page.waitForSelector('[data-testid="product-card"]');
    await page.click('[data-testid="product-card"] a');

    await page.waitForURL(/\/produkt\/.+/);
    
    // Check for capacity/variation selectors
    const capacitySelect = page.locator('#capacity-select');
    const variationRadios = page.locator('input[type="radio"][name*="capacity"], input[type="radio"][name*="pojemność"]');
    
    if (await capacitySelect.isVisible()) {
      // Test dropdown selection
      const options = await capacitySelect.locator('option').count();
      if (options > 1) {
        await capacitySelect.selectOption({ index: 1 });
        await expect(capacitySelect).toHaveValue(await capacitySelect.evaluate(el => (el as HTMLSelectElement).options[1].value));
      }
    } else if (await variationRadios.first().isVisible()) {
      // Test radio button selection
      await variationRadios.first().check();
      await expect(variationRadios.first()).toBeChecked();
    }
  });

  test('should display JSON-LD structured data', async ({ page }) => {
    await page.goto('/sklep');
    await page.waitForSelector('[data-testid="product-card"]');
    await page.click('[data-testid="product-card"] a');

    await page.waitForURL(/\/produkt\/.+/);
    
    // Check for JSON-LD scripts in head
    const jsonLdScripts = await page.locator('script[type="application/ld+json"]').count();
    expect(jsonLdScripts).toBeGreaterThan(0);
    
    // Verify Product schema
    const productSchema = page.locator('script[type="application/ld+json"]:has-text("@type":"Product")');
    await expect(productSchema).toBeVisible();
    
    // Verify BreadcrumbList schema
    const breadcrumbSchema = page.locator('script[type="application/ld+json"]:has-text("@type":"BreadcrumbList")');
    await expect(breadcrumbSchema).toBeVisible();
  });
});


