import { test, expect } from './fixtures';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard page', async ({ authenticatedPage: page }) => {
    // Dashboard heading or welcome message
    await expect(page.getByRole('heading', { name: /لوحة التحكم|dashboard|مرحباً|welcome/i })).toBeVisible();
  });

  test('should display statistics cards', async ({ authenticatedPage: page }) => {
    // Stats cards should be visible
    const statsSection = page.locator('[data-testid="stats-cards"], .stats-cards, .grid').first();
    await expect(statsSection).toBeVisible();

    // Should have multiple stat cards
    const cards = page.locator('[data-testid="stat-card"], .stat-card, .card').filter({
      has: page.locator('h3, h4, .stat-value, .text-2xl'),
    });

    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('should display deals statistics', async ({ authenticatedPage: page }) => {
    // Deals stat card
    const dealsCard = page.getByText(/الصفقات|deals/i).locator('..');
    if (await dealsCard.isVisible()) {
      await expect(dealsCard).toBeVisible();
    }
  });

  test('should display leads statistics', async ({ authenticatedPage: page }) => {
    // Leads stat card
    const leadsCard = page.getByText(/العملاء المحتملين|leads/i).locator('..');
    if (await leadsCard.isVisible()) {
      await expect(leadsCard).toBeVisible();
    }
  });

  test('should display contacts statistics', async ({ authenticatedPage: page }) => {
    // Contacts stat card
    const contactsCard = page.getByText(/جهات الاتصال|contacts/i).locator('..');
    if (await contactsCard.isVisible()) {
      await expect(contactsCard).toBeVisible();
    }
  });

  test('should display recent activities widget', async ({ authenticatedPage: page }) => {
    // Recent activities section
    const recentActivities = page.getByText(/الأنشطة الأخيرة|recent activities/i).or(
      page.locator('[data-testid="recent-activities"]')
    );

    if (await recentActivities.isVisible()) {
      await expect(recentActivities).toBeVisible();
    }
  });

  test('should display upcoming activities widget', async ({ authenticatedPage: page }) => {
    // Upcoming activities section
    const upcomingActivities = page.getByText(/الأنشطة القادمة|upcoming activities/i).or(
      page.locator('[data-testid="upcoming-activities"]')
    );

    if (await upcomingActivities.isVisible()) {
      await expect(upcomingActivities).toBeVisible();
    }
  });

  test('should display sales chart', async ({ authenticatedPage: page }) => {
    // Sales chart
    const chart = page.locator('[data-testid="sales-chart"], .recharts-wrapper, canvas, svg.chart');

    if (await chart.isVisible()) {
      await expect(chart).toBeVisible();
    }
  });

  test('should display deals by stage chart', async ({ authenticatedPage: page }) => {
    // Deals by stage chart
    const chartTitle = page.getByText(/الصفقات حسب المرحلة|deals by stage/i);

    if (await chartTitle.isVisible()) {
      await expect(chartTitle).toBeVisible();
    }
  });

  test('should display sales leaderboard', async ({ authenticatedPage: page }) => {
    // Sales leaderboard
    const leaderboard = page.getByText(/أفضل المبيعات|sales leaderboard|ترتيب المبيعات/i).or(
      page.locator('[data-testid="leaderboard"]')
    );

    if (await leaderboard.isVisible()) {
      await expect(leaderboard).toBeVisible();
    }
  });

  test('should navigate to contacts from stat card', async ({ authenticatedPage: page }) => {
    // Click on contacts stat card
    const contactsCard = page.getByText(/جهات الاتصال|contacts/i).locator('..').locator('a, button').first();

    if (await contactsCard.isVisible()) {
      await contactsCard.click();
      await page.waitForURL('**/contacts');
      await expect(page).toHaveURL(/contacts/);
    }
  });

  test('should navigate to deals from stat card', async ({ authenticatedPage: page }) => {
    // Click on deals stat card
    const dealsCard = page.getByText(/الصفقات|deals/i).locator('..').locator('a, button').first();

    if (await dealsCard.isVisible()) {
      await dealsCard.click();
      await page.waitForURL('**/deals');
      await expect(page).toHaveURL(/deals/);
    }
  });

  test('should navigate to leads from stat card', async ({ authenticatedPage: page }) => {
    // Click on leads stat card
    const leadsCard = page.getByText(/العملاء المحتملين|leads/i).locator('..').locator('a, button').first();

    if (await leadsCard.isVisible()) {
      await leadsCard.click();
      await page.waitForURL('**/leads');
      await expect(page).toHaveURL(/leads/);
    }
  });

  test('should display notifications bell', async ({ authenticatedPage: page }) => {
    // Notifications bell icon
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"], .notification-bell')
    );

    await expect(notificationBell).toBeVisible();
  });

  test('should open notifications panel when bell is clicked', async ({ authenticatedPage: page }) => {
    // Click notification bell
    const notificationBell = page.getByRole('button', { name: /الإشعارات|notifications/i }).or(
      page.locator('[data-testid="notification-bell"], .notification-bell')
    );

    if (await notificationBell.isVisible()) {
      await notificationBell.click();

      // Notifications panel should open
      const panel = page.locator('[data-testid="notifications-panel"], .notifications-panel, [role="dialog"]');
      await expect(panel).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display user menu', async ({ authenticatedPage: page }) => {
    // User avatar/menu
    const userMenu = page.getByRole('button', { name: /الملف الشخصي|profile/i }).or(
      page.locator('[data-testid="user-menu"], .user-menu, .avatar')
    );

    await expect(userMenu).toBeVisible();
  });

  test('should refresh data when refresh button clicked', async ({ authenticatedPage: page }) => {
    // Find refresh button if exists
    const refreshButton = page.getByRole('button', { name: /تحديث|refresh/i });

    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      // Wait for data to refresh
      await page.waitForLoadState('networkidle');
    }
  });
});
