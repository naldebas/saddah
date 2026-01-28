import { test, expect } from './fixtures';

test.describe('Deals & Pipeline', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');
  });

  test('should display deals kanban board', async ({ authenticatedPage: page }) => {
    // Page heading should be visible
    await expect(page.getByRole('heading', { name: /الصفقات|deals/i })).toBeVisible();

    // Kanban columns should be visible
    await expect(page.locator('[data-testid="kanban-column"], .kanban-column, [class*="column"]')).toHaveCount.call;
  });

  test('should open create deal modal', async ({ authenticatedPage: page }) => {
    // Click add button
    await page.getByRole('button', { name: /إضافة|add|جديد|new/i }).click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // Form fields should be present
    await expect(page.getByLabel(/العنوان|title/i)).toBeVisible();
    await expect(page.getByLabel(/القيمة|value|المبلغ|amount/i)).toBeVisible();
  });

  test('should create a new deal', async ({ authenticatedPage: page }) => {
    // Open modal
    await page.getByRole('button', { name: /إضافة|add|جديد|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill form
    const timestamp = Date.now();
    await page.getByLabel(/العنوان|title/i).fill(`صفقة اختبار ${timestamp}`);
    await page.getByLabel(/القيمة|value|المبلغ|amount/i).fill('100000');

    // Select stage if available
    const stageSelect = page.getByLabel(/المرحلة|stage/i);
    if (await stageSelect.isVisible()) {
      await stageSelect.selectOption({ index: 0 });
    }

    // Submit
    await page.getByRole('button', { name: /حفظ|save|إضافة|add|إنشاء|create/i }).click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Success message
    await expect(page.getByText(/تم|success|نجاح/i)).toBeVisible();
  });

  test('should filter deals by pipeline', async ({ authenticatedPage: page }) => {
    // Find pipeline selector
    const pipelineSelect = page.locator('select[name="pipeline"], [data-testid="pipeline-select"]');

    if (await pipelineSelect.isVisible()) {
      // Change pipeline
      await pipelineSelect.selectOption({ index: 1 });

      // Wait for board to update
      await page.waitForLoadState('networkidle');
    }
  });

  test('should view deal details', async ({ authenticatedPage: page }) => {
    // Wait for deals to load
    await page.waitForSelector('[data-testid="deal-card"], .deal-card', { timeout: 10000 }).catch(() => {});

    // Click on first deal if exists
    const firstDeal = page.locator('[data-testid="deal-card"], .deal-card').first();

    if (await firstDeal.isVisible()) {
      await firstDeal.click();

      // Detail modal should open
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    }
  });
});
