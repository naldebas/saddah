import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page', async ({ page }) => {
    // Check page title and form elements
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByLabel(/البريد الإلكتروني|email/i)).toBeVisible();
    await expect(page.getByLabel(/كلمة المرور|password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /تسجيل الدخول|login|sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: /تسجيل الدخول|login|sign in/i }).click();

    // Check for validation messages
    await expect(page.getByText(/البريد الإلكتروني مطلوب|email is required/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill with invalid credentials
    await page.getByLabel(/البريد الإلكتروني|email/i).fill('wrong@email.com');
    await page.getByLabel(/كلمة المرور|password/i).fill('wrongpassword');

    // Submit
    await page.getByRole('button', { name: /تسجيل الدخول|login|sign in/i }).click();

    // Wait for error message
    await expect(page.getByText(/خطأ|error|incorrect|invalid/i)).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Fill with valid credentials
    await page.getByLabel(/البريد الإلكتروني|email/i).fill('admin@saddah.io');
    await page.getByLabel(/كلمة المرور|password/i).fill('Admin@123');

    // Submit
    await page.getByRole('button', { name: /تسجيل الدخول|login|sign in/i }).click();

    // Should redirect to dashboard
    await page.waitForURL('**/', { timeout: 10000 });
    await expect(page).toHaveURL('/');
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access contacts page without auth
    await page.goto('/contacts');

    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
