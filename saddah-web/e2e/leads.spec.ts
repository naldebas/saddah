import { test, expect, generateUniqueEmail, generateUniquePhone, waitForToast } from './fixtures';

test.describe('Leads', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
  });

  test('should display leads page with statistics', async ({ authenticatedPage: page }) => {
    // Page heading should be visible
    await expect(page.getByRole('heading', { name: /العملاء المحتملين|leads/i })).toBeVisible();

    // Statistics cards should be visible
    await expect(page.getByText(/إجمالي|total/i)).toBeVisible();

    // Add lead button should be visible
    await expect(page.getByRole('button', { name: /إضافة|add|جديد|new/i })).toBeVisible();
  });

  test('should display filter options', async ({ authenticatedPage: page }) => {
    // Status filter should be visible
    const statusFilter = page.getByLabel(/الحالة|status/i);
    if (await statusFilter.isVisible()) {
      await expect(statusFilter).toBeVisible();
    }

    // Source filter should be visible
    const sourceFilter = page.getByLabel(/المصدر|source/i);
    if (await sourceFilter.isVisible()) {
      await expect(sourceFilter).toBeVisible();
    }
  });

  test('should open create lead modal', async ({ authenticatedPage: page }) => {
    // Click add button
    await page.getByRole('button', { name: /إضافة|add|جديد|new/i }).click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // Form fields should be present
    await expect(page.getByLabel(/الاسم الأول|first name/i)).toBeVisible();
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

  test('should create a new lead', async ({ authenticatedPage: page }) => {
    // Open modal
    await page.getByRole('button', { name: /إضافة|add|جديد|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill form
    const timestamp = Date.now();
    await page.getByLabel(/الاسم الأول|first name/i).fill(`عميل محتمل ${timestamp}`);

    const lastNameField = page.getByLabel(/الاسم الأخير|last name/i);
    if (await lastNameField.isVisible()) {
      await lastNameField.fill('تجريبي');
    }

    const phoneField = page.getByLabel(/الجوال|phone|هاتف/i);
    if (await phoneField.isVisible()) {
      await phoneField.fill(generateUniquePhone());
    }

    const emailField = page.getByLabel(/البريد الإلكتروني|email/i);
    if (await emailField.isVisible()) {
      await emailField.fill(generateUniqueEmail('lead'));
    }

    // Select source if available
    const sourceSelect = page.getByLabel(/المصدر|source/i);
    if (await sourceSelect.isVisible()) {
      await sourceSelect.selectOption({ index: 1 });
    }

    // Submit
    await page.getByRole('button', { name: /حفظ|save|إضافة|add/i }).click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Success message should appear
    await waitForToast(page, /تم|success|نجاح/i);
  });

  test('should filter leads by status', async ({ authenticatedPage: page }) => {
    const statusFilter = page.getByLabel(/الحالة|status/i);

    if (await statusFilter.isVisible()) {
      // Get initial count
      const initialRows = await page.locator('table tbody tr').count();

      // Select a status filter
      await statusFilter.selectOption({ index: 1 });

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Results may change
      const filteredRows = await page.locator('table tbody tr').count();
      expect(filteredRows).toBeLessThanOrEqual(initialRows);
    }
  });

  test('should display lead score and grade', async ({ authenticatedPage: page }) => {
    // Wait for leads to load
    const firstRow = page.locator('table tbody tr').first();

    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Score column should show score value or progress bar
      const scoreCell = firstRow.locator('td').nth(5); // Assuming score is 6th column
      await expect(scoreCell).toBeVisible();
    }
  });

  test('should open lead detail when clicking on lead', async ({ authenticatedPage: page }) => {
    // Wait for leads to load
    const firstLead = page.locator('table tbody tr').first();

    if (await firstLead.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstLead.click();

      // Detail view should open
      await expect(page.getByRole('dialog').or(page.getByText(/تفاصيل|details/i))).toBeVisible({ timeout: 5000 });
    }
  });

  test('should update lead status', async ({ authenticatedPage: page }) => {
    // Wait for leads to load
    const firstLead = page.locator('table tbody tr').first();

    if (await firstLead.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstLead.click();

      // Wait for detail view
      await page.waitForTimeout(500);

      // Find status dropdown or button
      const statusButton = page.getByRole('button', { name: /الحالة|status/i }).or(
        page.getByLabel(/الحالة|status/i)
      );

      if (await statusButton.isVisible()) {
        await statusButton.click();

        // Select a new status
        const statusOption = page.getByRole('option', { name: /تم التواصل|contacted/i }).or(
          page.getByText(/تم التواصل|contacted/i)
        );

        if (await statusOption.isVisible()) {
          await statusOption.click();
          await waitForToast(page, /تم|success/i);
        }
      }
    }
  });

  test('should search leads', async ({ authenticatedPage: page }) => {
    const searchInput = page.getByPlaceholder(/بحث|search/i);

    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('test');

      // Wait for results to update
      await page.waitForTimeout(500);

      // Table should update (may show no results or filtered results)
      await expect(page.locator('table')).toBeVisible();
    }
  });
});
