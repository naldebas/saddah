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

// Navigation helpers
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

// Modal helpers
export async function openModal(page: Page, buttonName: RegExp | string) {
  await page.getByRole('button', { name: buttonName }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

export async function closeModal(page: Page) {
  const closeButton = page.getByRole('button', { name: /إغلاق|close|×/i });
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

// Form helpers
export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields)) {
    const input = page.getByLabel(new RegExp(label, 'i'));
    if (await input.isVisible()) {
      await input.fill(value);
    }
  }
}

export async function submitForm(page: Page, buttonName: RegExp = /حفظ|save|إضافة|add|تأكيد|confirm/i) {
  await page.getByRole('button', { name: buttonName }).click();
}

// Table helpers
export async function getTableRowCount(page: Page): Promise<number> {
  const rows = page.locator('table tbody tr');
  return await rows.count();
}

export async function clickTableRow(page: Page, index: number = 0) {
  const row = page.locator('table tbody tr').nth(index);
  if (await row.isVisible()) {
    await row.click();
  }
}

// Wait helpers
export async function waitForToast(page: Page, text?: RegExp) {
  const toast = text
    ? page.getByText(text)
    : page.locator('[data-sonner-toast], [role="status"]').first();
  await expect(toast).toBeVisible({ timeout: 5000 });
}

export async function waitForLoadingComplete(page: Page) {
  // Wait for any spinners to disappear
  const spinner = page.locator('[data-testid="spinner"], .animate-spin').first();
  if (await spinner.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expect(spinner).not.toBeVisible({ timeout: 30000 });
  }
}

// Generate unique test data
export function generateUniqueEmail(prefix: string = 'test'): string {
  return `${prefix}${Date.now()}@test.com`;
}

export function generateUniquePhone(): string {
  return `+9665${Math.floor(10000000 + Math.random() * 90000000)}`;
}
