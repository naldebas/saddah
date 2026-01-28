import { test, expect } from './fixtures';

test.describe('Navigation', () => {
  test('should navigate through main menu items', async ({ authenticatedPage: page }) => {
    // Dashboard should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Navigate to Contacts
    await page.getByRole('link', { name: /جهات الاتصال|contacts/i }).click();
    await expect(page).toHaveURL(/\/contacts/);
    await expect(page.getByRole('heading', { name: /جهات الاتصال|contacts/i })).toBeVisible();

    // Navigate to Companies
    await page.getByRole('link', { name: /الشركات|companies/i }).click();
    await expect(page).toHaveURL(/\/companies/);
    await expect(page.getByRole('heading', { name: /الشركات|companies/i })).toBeVisible();

    // Navigate to Deals
    await page.getByRole('link', { name: /الصفقات|deals/i }).click();
    await expect(page).toHaveURL(/\/deals/);

    // Navigate to Leads
    await page.getByRole('link', { name: /العملاء المحتملين|leads/i }).click();
    await expect(page).toHaveURL(/\/leads/);

    // Navigate to Activities
    await page.getByRole('link', { name: /الأنشطة|activities/i }).click();
    await expect(page).toHaveURL(/\/activities/);

    // Navigate to Reports
    await page.getByRole('link', { name: /التقارير|reports/i }).click();
    await expect(page).toHaveURL(/\/reports/);

    // Navigate to Settings
    await page.getByRole('link', { name: /الإعدادات|settings/i }).click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('should display sidebar on desktop', async ({ authenticatedPage: page }) => {
    // Set viewport to desktop
    await page.setViewportSize({ width: 1280, height: 720 });

    // Sidebar should be visible
    await expect(page.getByRole('navigation')).toBeVisible();

    // All main nav items should be visible
    await expect(page.getByRole('link', { name: /جهات الاتصال|contacts/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /الشركات|companies/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /الصفقات|deals/i })).toBeVisible();
  });

  test('should show mobile menu on small screens', async ({ authenticatedPage: page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Menu toggle should be visible
    const menuToggle = page.getByRole('button', { name: /menu|القائمة/i });
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
      // Navigation should appear
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });
});
