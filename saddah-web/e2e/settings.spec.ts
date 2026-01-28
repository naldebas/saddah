import { test, expect } from './fixtures';

test.describe('Settings', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display settings page', async ({ authenticatedPage: page }) => {
    // Page heading should be visible
    await expect(page.getByRole('heading', { name: /الإعدادات|settings/i })).toBeVisible();

    // Settings tabs should be visible
    await expect(page.getByRole('button', { name: /الملف الشخصي|profile/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /الإشعارات|notifications/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /اللغة|language/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /الأمان|security/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /الفريق|team/i })).toBeVisible();
  });

  test('should switch between settings tabs', async ({ authenticatedPage: page }) => {
    // Click on notifications tab
    await page.getByRole('button', { name: /الإشعارات|notifications/i }).click();
    await expect(page.getByText(/إشعارات البريد|email notifications/i)).toBeVisible();

    // Click on language tab
    await page.getByRole('button', { name: /اللغة|language/i }).click();
    await expect(page.getByText(/العربية|arabic/i)).toBeVisible();

    // Click on security tab
    await page.getByRole('button', { name: /الأمان|security/i }).click();
    await expect(page.getByText(/كلمة المرور|password/i)).toBeVisible();
  });

  test('should update profile information', async ({ authenticatedPage: page }) => {
    // Profile tab should be active by default
    const firstNameInput = page.getByLabel(/الاسم الأول|first name/i);
    await expect(firstNameInput).toBeVisible();

    // Get current value
    const originalValue = await firstNameInput.inputValue();

    // Update value
    await firstNameInput.fill('اسم جديد');

    // Click save
    await page.getByRole('button', { name: /حفظ|save/i }).click();

    // Success message should appear
    await expect(page.getByText(/تم|success|نجاح/i)).toBeVisible();

    // Restore original value
    await firstNameInput.fill(originalValue);
    await page.getByRole('button', { name: /حفظ|save/i }).click();
  });

  test('should display team members', async ({ authenticatedPage: page }) => {
    // Click on team tab
    await page.getByRole('button', { name: /الفريق|team/i }).click();

    // Team heading should be visible
    await expect(page.getByText(/أعضاء الفريق|team members/i)).toBeVisible();

    // Add member button should be visible
    await expect(page.getByRole('button', { name: /إضافة عضو|add member/i })).toBeVisible();
  });

  test('should open add team member modal', async ({ authenticatedPage: page }) => {
    // Go to team tab
    await page.getByRole('button', { name: /الفريق|team/i }).click();

    // Click add member button
    await page.getByRole('button', { name: /إضافة عضو|add member/i }).click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // Form fields should be present
    await expect(page.getByLabel(/البريد الإلكتروني|email/i)).toBeVisible();
    await expect(page.getByLabel(/كلمة المرور|password/i)).toBeVisible();
  });

  test('should change language', async ({ authenticatedPage: page }) => {
    // Go to language tab
    await page.getByRole('button', { name: /اللغة|language/i }).click();

    // English option should be visible
    const englishOption = page.getByText('English');
    await expect(englishOption).toBeVisible();

    // Click English
    await englishOption.click();

    // Page should update to English (check direction or text)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Switch back to Arabic
    await page.getByText('العربية').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });
});
