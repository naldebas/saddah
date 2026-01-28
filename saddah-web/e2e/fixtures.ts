import { test as base, expect, Page } from '@playwright/test';

// Test credentials
export const TEST_USER = {
  email: 'admin@saddah.io',
  password: 'Admin@123',
};

// Extended test fixture with authenticated page
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto('/login');

    // Fill login form
    await page.getByLabel(/البريد الإلكتروني|email/i).fill(TEST_USER.email);
    await page.getByLabel(/كلمة المرور|password/i).fill(TEST_USER.password);

    // Submit
    await page.getByRole('button', { name: /تسجيل الدخول|login|sign in/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL('**/');
    await expect(page).toHaveURL('/');

    await use(page);
  },
});

export { expect };

// Helper functions
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/البريد الإلكتروني|email/i).fill(email);
  await page.getByLabel(/كلمة المرور|password/i).fill(password);
  await page.getByRole('button', { name: /تسجيل الدخول|login|sign in/i }).click();
  await page.waitForURL('**/');
}

export async function logout(page: Page) {
  // Click user menu and logout
  await page.getByRole('button', { name: /الملف الشخصي|profile/i }).click();
  await page.getByRole('menuitem', { name: /تسجيل الخروج|logout/i }).click();
  await page.waitForURL('**/login');
}
