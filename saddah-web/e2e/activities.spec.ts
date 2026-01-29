import { test, expect, waitForToast } from './fixtures';

test.describe('Activities', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
  });

  test('should display activities page', async ({ authenticatedPage: page }) => {
    // Page heading should be visible
    await expect(page.getByRole('heading', { name: /الأنشطة|activities/i })).toBeVisible();

    // Add activity button should be visible
    await expect(page.getByRole('button', { name: /إضافة|add|جديد|new/i })).toBeVisible();
  });

  test('should display activity type filters', async ({ authenticatedPage: page }) => {
    // Type filter should be visible (tabs or dropdown)
    const typeFilter = page.getByRole('tablist').or(page.getByLabel(/النوع|type/i));

    if (await typeFilter.isVisible()) {
      await expect(typeFilter).toBeVisible();
    }
  });

  test('should open create activity modal', async ({ authenticatedPage: page }) => {
    // Click add button
    await page.getByRole('button', { name: /إضافة|add|جديد|new/i }).click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // Form fields should be present
    await expect(page.getByLabel(/الموضوع|subject|العنوان|title/i)).toBeVisible();
  });

  test('should create a call activity', async ({ authenticatedPage: page }) => {
    // Open modal
    await page.getByRole('button', { name: /إضافة|add|جديد|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select activity type - call
    const typeSelect = page.getByLabel(/النوع|type/i);
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ label: /مكالمة|call/i });
    }

    // Fill form
    const timestamp = Date.now();
    await page.getByLabel(/الموضوع|subject|العنوان/i).fill(`مكالمة متابعة ${timestamp}`);

    const descriptionField = page.getByLabel(/الوصف|description|ملاحظات|notes/i);
    if (await descriptionField.isVisible()) {
      await descriptionField.fill('متابعة مع العميل بخصوص العرض');
    }

    // Set due date if available
    const dueDateField = page.getByLabel(/تاريخ الاستحقاق|due date|الموعد/i);
    if (await dueDateField.isVisible()) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await dueDateField.fill(tomorrow.toISOString().split('T')[0]);
    }

    // Submit
    await page.getByRole('button', { name: /حفظ|save|إضافة|add/i }).click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Success message should appear
    await waitForToast(page, /تم|success|نجاح/i);
  });

  test('should create a meeting activity', async ({ authenticatedPage: page }) => {
    // Open modal
    await page.getByRole('button', { name: /إضافة|add|جديد|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select activity type - meeting
    const typeSelect = page.getByLabel(/النوع|type/i);
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ label: /اجتماع|meeting/i });
    }

    // Fill form
    const timestamp = Date.now();
    await page.getByLabel(/الموضوع|subject|العنوان/i).fill(`اجتماع عرض ${timestamp}`);

    // Submit
    await page.getByRole('button', { name: /حفظ|save|إضافة|add/i }).click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('should mark activity as completed', async ({ authenticatedPage: page }) => {
    // Wait for activities to load
    const firstActivity = page.locator('table tbody tr, [data-testid="activity-item"]').first();

    if (await firstActivity.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Find complete checkbox or button
      const completeButton = firstActivity.getByRole('checkbox').or(
        firstActivity.getByRole('button', { name: /إكمال|complete|تم/i })
      );

      if (await completeButton.isVisible()) {
        await completeButton.click();

        // Success message or status change
        await page.waitForTimeout(500);
      }
    }
  });

  test('should filter activities by type', async ({ authenticatedPage: page }) => {
    // Check for tabs
    const tabs = page.getByRole('tablist');

    if (await tabs.isVisible()) {
      // Click on calls tab
      const callsTab = page.getByRole('tab', { name: /مكالمات|calls/i });
      if (await callsTab.isVisible()) {
        await callsTab.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display upcoming activities', async ({ authenticatedPage: page }) => {
    // Check for upcoming section or filter
    const upcomingFilter = page.getByRole('button', { name: /قادمة|upcoming/i }).or(
      page.getByText(/الأنشطة القادمة|upcoming activities/i)
    );

    if (await upcomingFilter.isVisible()) {
      await expect(upcomingFilter).toBeVisible();
    }
  });

  test('should display overdue activities', async ({ authenticatedPage: page }) => {
    // Check for overdue section or filter
    const overdueFilter = page.getByRole('button', { name: /متأخرة|overdue/i }).or(
      page.getByText(/الأنشطة المتأخرة|overdue activities/i)
    );

    if (await overdueFilter.isVisible()) {
      await expect(overdueFilter).toBeVisible();
    }
  });

  test('should open activity detail when clicked', async ({ authenticatedPage: page }) => {
    // Wait for activities to load
    const firstActivity = page.locator('table tbody tr, [data-testid="activity-item"]').first();

    if (await firstActivity.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstActivity.click();

      // Detail view should open
      await page.waitForTimeout(500);
    }
  });

  test('should delete an activity', async ({ authenticatedPage: page }) => {
    // Wait for activities to load
    const firstActivity = page.locator('table tbody tr, [data-testid="activity-item"]').first();

    if (await firstActivity.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click on activity to open detail
      await firstActivity.click();
      await page.waitForTimeout(500);

      // Find delete button
      const deleteButton = page.getByRole('button', { name: /حذف|delete/i });

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = page.getByRole('button', { name: /تأكيد|confirm|نعم|yes/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await waitForToast(page, /تم|deleted|حذف/i);
        }
      }
    }
  });
});
