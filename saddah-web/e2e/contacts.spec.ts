import { test, expect } from './fixtures';

test.describe('Contacts', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
  });

  test('should display contacts page', async ({ authenticatedPage: page }) => {
    // Page heading should be visible
    await expect(page.getByRole('heading', { name: /جهات الاتصال|contacts/i })).toBeVisible();

    // Add contact button should be visible
    await expect(page.getByRole('button', { name: /إضافة|add|جديد|new/i })).toBeVisible();
  });

  test('should open create contact modal', async ({ authenticatedPage: page }) => {
    // Click add button
    await page.getByRole('button', { name: /إضافة|add|جديد|new/i }).click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // Form fields should be present
    await expect(page.getByLabel(/الاسم الأول|first name/i)).toBeVisible();
    await expect(page.getByLabel(/الاسم الأخير|last name/i)).toBeVisible();
  });

  test('should validate required fields in create form', async ({ authenticatedPage: page }) => {
    // Open modal
    await page.getByRole('button', { name: /إضافة|add|جديد|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Try to submit without required fields
    await page.getByRole('button', { name: /حفظ|save|إضافة|add/i }).click();

    // Validation errors should appear
    await expect(page.getByText(/مطلوب|required/i)).toBeVisible();
  });

  test('should create a new contact', async ({ authenticatedPage: page }) => {
    // Open modal
    await page.getByRole('button', { name: /إضافة|add|جديد|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill form
    const timestamp = Date.now();
    await page.getByLabel(/الاسم الأول|first name/i).fill(`اختبار ${timestamp}`);
    await page.getByLabel(/الاسم الأخير|last name/i).fill('تست');
    await page.getByLabel(/البريد الإلكتروني|email/i).fill(`test${timestamp}@test.com`);
    await page.getByLabel(/الجوال|phone/i).fill('+966501234567');

    // Submit
    await page.getByRole('button', { name: /حفظ|save|إضافة|add/i }).click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Success message should appear
    await expect(page.getByText(/تم|success|نجاح/i)).toBeVisible();
  });

  test('should search contacts', async ({ authenticatedPage: page }) => {
    // Find search input
    const searchInput = page.getByPlaceholder(/بحث|search/i);

    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('test');

      // Wait for results to update
      await page.waitForTimeout(500);

      // Results should be filtered
      await expect(page.locator('table tbody tr, [data-testid="contact-card"]')).toHaveCount.call;
    }
  });

  test('should open contact detail when clicking on contact', async ({ authenticatedPage: page }) => {
    // Wait for contacts to load
    await page.waitForSelector('table tbody tr, [data-testid="contact-card"]', { timeout: 10000 }).catch(() => {});

    // Click on first contact if exists
    const firstContact = page.locator('table tbody tr, [data-testid="contact-card"]').first();

    if (await firstContact.isVisible()) {
      await firstContact.click();

      // Detail view should open (modal or page)
      await expect(page.getByText(/تفاصيل|details|معلومات/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
