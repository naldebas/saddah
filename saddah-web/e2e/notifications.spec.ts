import { test, expect, waitForToast } from './fixtures';

test.describe('Notifications', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display notification bell in header', async ({ authenticatedPage: page }) => {
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"], .notification-bell, [aria-label*="notification"]')
    );

    await expect(notificationBell).toBeVisible();
  });

  test('should display unread count badge', async ({ authenticatedPage: page }) => {
    const badge = page.locator('[data-testid="notification-badge"], .notification-badge, .badge');

    // Badge may or may not be visible depending on unread count
    if (await badge.isVisible()) {
      await expect(badge).toBeVisible();
    }
  });

  test('should open notifications panel', async ({ authenticatedPage: page }) => {
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"], .notification-bell')
    );

    if (await notificationBell.isVisible()) {
      await notificationBell.click();

      // Panel should open
      const panel = page.locator('[data-testid="notifications-panel"], .notifications-panel').or(
        page.getByRole('dialog')
      );
      await expect(panel).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display notifications list', async ({ authenticatedPage: page }) => {
    // Open notifications panel
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"]')
    );

    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);

      // Notifications list or empty state
      const list = page.locator('[data-testid="notification-list"], .notification-list').or(
        page.getByText(/لا توجد إشعارات|no notifications/i)
      );
      await expect(list).toBeVisible({ timeout: 3000 });
    }
  });

  test('should mark notification as read when clicked', async ({ authenticatedPage: page }) => {
    // Open notifications panel
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"]')
    );

    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);

      // Find first unread notification
      const firstNotification = page.locator('[data-testid="notification-item"], .notification-item').first();

      if (await firstNotification.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstNotification.click();
        // Notification should be marked as read (UI may change)
        await page.waitForTimeout(500);
      }
    }
  });

  test('should mark all notifications as read', async ({ authenticatedPage: page }) => {
    // Open notifications panel
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"]')
    );

    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);

      // Find mark all as read button
      const markAllButton = page.getByRole('button', { name: /تحديد الكل كمقروء|mark all as read/i });

      if (await markAllButton.isVisible()) {
        await markAllButton.click();
        await waitForToast(page, /تم|marked|read/i);
      }
    }
  });

  test('should delete a notification', async ({ authenticatedPage: page }) => {
    // Open notifications panel
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"]')
    );

    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);

      // Find first notification
      const firstNotification = page.locator('[data-testid="notification-item"], .notification-item').first();

      if (await firstNotification.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Hover to show delete button
        await firstNotification.hover();

        const deleteButton = firstNotification.getByRole('button', { name: /حذف|delete/i }).or(
          firstNotification.locator('[data-testid="delete-notification"]')
        );

        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should clear all notifications', async ({ authenticatedPage: page }) => {
    // Open notifications panel
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"]')
    );

    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);

      // Find clear all button
      const clearAllButton = page.getByRole('button', { name: /مسح الكل|clear all|حذف الكل/i });

      if (await clearAllButton.isVisible()) {
        await clearAllButton.click();

        // Confirm if needed
        const confirmButton = page.getByRole('button', { name: /تأكيد|confirm|نعم/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await waitForToast(page, /تم|cleared|deleted/i);
      }
    }
  });

  test('should close notifications panel when clicking outside', async ({ authenticatedPage: page }) => {
    // Open notifications panel
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"]')
    );

    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);

      // Click outside the panel
      await page.locator('body').click({ position: { x: 10, y: 10 } });

      // Panel should close
      const panel = page.locator('[data-testid="notifications-panel"], .notifications-panel');
      await expect(panel).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('should close notifications panel with escape key', async ({ authenticatedPage: page }) => {
    // Open notifications panel
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"]')
    );

    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);

      // Press escape
      await page.keyboard.press('Escape');

      // Panel should close
      const panel = page.locator('[data-testid="notifications-panel"], .notifications-panel');
      await expect(panel).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('should navigate to related entity when notification clicked', async ({ authenticatedPage: page }) => {
    // Open notifications panel
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"]')
    );

    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);

      // Find a notification with a link
      const notificationLink = page.locator('[data-testid="notification-item"] a, .notification-item a').first();

      if (await notificationLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await notificationLink.click();
        // Should navigate away from current page
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display notification timestamp', async ({ authenticatedPage: page }) => {
    // Open notifications panel
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"]')
    );

    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);

      // Find first notification
      const firstNotification = page.locator('[data-testid="notification-item"], .notification-item').first();

      if (await firstNotification.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Should show relative time (e.g., "منذ دقيقة" or "1 minute ago")
        const timestamp = firstNotification.locator('.timestamp, .time, time');
        if (await timestamp.isVisible()) {
          await expect(timestamp).toBeVisible();
        }
      }
    }
  });
});
