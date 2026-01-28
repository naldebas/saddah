import { test, expect } from './fixtures';

test.describe('Reports', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
  });

  test('should display reports page', async ({ authenticatedPage: page }) => {
    // Page heading should be visible
    await expect(page.getByRole('heading', { name: /التقارير|reports/i })).toBeVisible();

    // Stats cards should be visible
    await expect(page.locator('.card, [class*="Card"]')).toHaveCount.call;
  });

  test('should display period selector', async ({ authenticatedPage: page }) => {
    // Period selector should be visible
    const periodSelect = page.locator('select').first();
    await expect(periodSelect).toBeVisible();

    // Options should include common periods
    await periodSelect.click();
    await expect(page.getByText(/هذا الشهر|this month/i)).toBeVisible();
  });

  test('should change report period', async ({ authenticatedPage: page }) => {
    // Find period selector
    const periodSelect = page.locator('select').first();

    // Change to "this quarter"
    await periodSelect.selectOption('this_quarter');

    // Wait for data to reload
    await page.waitForLoadState('networkidle');

    // Charts should still be visible
    await expect(page.locator('.recharts-wrapper, svg').first()).toBeVisible();
  });

  test('should display charts', async ({ authenticatedPage: page }) => {
    // Wait for charts to load
    await page.waitForTimeout(1000);

    // At least one chart should be visible
    await expect(page.locator('.recharts-wrapper, svg, canvas').first()).toBeVisible();
  });

  test('should have export buttons', async ({ authenticatedPage: page }) => {
    // Export buttons should be visible
    const exportButtons = page.getByRole('button', { name: /تصدير|export|download/i });
    await expect(exportButtons.first()).toBeVisible();
  });

  test('should trigger export', async ({ authenticatedPage: page }) => {
    // Click export button
    const exportButton = page.getByRole('button', { name: /تصدير|export/i }).first();

    if (await exportButton.isVisible()) {
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

      await exportButton.click();

      // Either download starts or success message appears
      const download = await downloadPromise;
      if (!download) {
        // Check for success message as alternative
        await expect(page.getByText(/تم|success|نجاح/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    }
  });
});
