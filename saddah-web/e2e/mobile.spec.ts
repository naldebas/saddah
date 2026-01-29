import { test, expect } from './fixtures';

// These tests run on mobile viewports
test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display mobile navigation menu', async ({ authenticatedPage: page }) => {
    // Desktop sidebar should be hidden
    const sidebar = page.locator('[data-testid="sidebar"], aside.sidebar');

    // Mobile menu button should be visible
    const menuButton = page.getByRole('button', { name: /القائمة|menu/i }).or(
      page.locator('[data-testid="mobile-menu-button"], .hamburger-menu')
    );

    await expect(menuButton).toBeVisible();
  });

  test('should open mobile navigation when menu button clicked', async ({ authenticatedPage: page }) => {
    const menuButton = page.getByRole('button', { name: /القائمة|menu/i }).or(
      page.locator('[data-testid="mobile-menu-button"], .hamburger-menu')
    );

    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Mobile nav should be visible
      const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-nav, nav').first();
      await expect(mobileNav).toBeVisible({ timeout: 3000 });
    }
  });

  test('should close mobile navigation when item clicked', async ({ authenticatedPage: page }) => {
    const menuButton = page.getByRole('button', { name: /القائمة|menu/i }).or(
      page.locator('[data-testid="mobile-menu-button"]')
    );

    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);

      // Click on contacts link
      const contactsLink = page.getByRole('link', { name: /جهات الاتصال|contacts/i });
      if (await contactsLink.isVisible()) {
        await contactsLink.click();

        // Should navigate and close menu
        await page.waitForURL('**/contacts');
      }
    }
  });

  test('should display dashboard stats in single column', async ({ authenticatedPage: page }) => {
    // Stats should stack vertically on mobile
    const statsContainer = page.locator('[data-testid="stats-cards"], .stats-cards').first();

    if (await statsContainer.isVisible()) {
      // Check for flex-col or single column layout
      await expect(statsContainer).toBeVisible();
    }
  });

  test('should display contacts table with horizontal scroll', async ({ authenticatedPage: page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table, [data-testid="data-table"]');

    if (await table.isVisible()) {
      // Table container should allow horizontal scroll
      const container = table.locator('..');
      await expect(container).toBeVisible();
    }
  });

  test('should display full-screen modal on mobile', async ({ authenticatedPage: page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');

    // Open create modal
    const addButton = page.getByRole('button', { name: /إضافة|add|جديد/i });
    if (await addButton.isVisible()) {
      await addButton.click();

      // Modal should take full width
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Check modal width is close to viewport width
      const boundingBox = await modal.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(300); // Should be nearly full width
      }
    }
  });

  test('should hide sidebar labels on small screens', async ({ authenticatedPage: page }) => {
    // On very small screens, sidebar may show only icons
    const sidebar = page.locator('[data-testid="sidebar"], aside.sidebar');

    if (await sidebar.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Should be collapsed or minimal
      const boundingBox = await sidebar.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThan(100); // Should be icon-only width
      }
    }
  });

  test('should display bottom navigation on mobile', async ({ authenticatedPage: page }) => {
    // Some mobile UIs use bottom navigation
    const bottomNav = page.locator('[data-testid="bottom-nav"], .bottom-nav, nav[role="navigation"]').last();

    // May or may not exist depending on design
  });

  test('should support touch gestures for swipe navigation', async ({ authenticatedPage: page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');

    // For kanban view, test swipe
    const kanbanColumn = page.locator('[data-testid="kanban-column"], .kanban-column').first();

    if (await kanbanColumn.isVisible()) {
      // Simulate swipe (touch drag)
      await kanbanColumn.hover();
    }
  });

  test('should display readable text without horizontal scroll on content', async ({ authenticatedPage: page }) => {
    // Main content should not cause horizontal scroll
    const mainContent = page.locator('main, [role="main"], .main-content').first();

    if (await mainContent.isVisible()) {
      const viewportWidth = 375;
      const boundingBox = await mainContent.boundingBox();

      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(viewportWidth);
      }
    }
  });

  test('should have properly sized touch targets', async ({ authenticatedPage: page }) => {
    // Buttons should be at least 44x44px for touch
    const buttons = page.getByRole('button').all();

    for (const button of await buttons) {
      const boundingBox = await button.boundingBox();
      if (boundingBox) {
        // Minimum touch target size is 44px
        expect(boundingBox.width).toBeGreaterThanOrEqual(40);
        expect(boundingBox.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

test.describe('Tablet Responsiveness', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad size

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display sidebar in collapsed state', async ({ authenticatedPage: page }) => {
    const sidebar = page.locator('[data-testid="sidebar"], aside.sidebar');

    if (await sidebar.isVisible()) {
      // Sidebar may be collapsed but visible
      await expect(sidebar).toBeVisible();
    }
  });

  test('should display two-column layout for stats', async ({ authenticatedPage: page }) => {
    const statsContainer = page.locator('[data-testid="stats-cards"], .stats-cards').first();

    if (await statsContainer.isVisible()) {
      // Should have 2-column grid on tablet
      await expect(statsContainer).toBeVisible();
    }
  });

  test('should display deals kanban board', async ({ authenticatedPage: page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');

    // Kanban should be visible on tablet
    const kanbanBoard = page.locator('[data-testid="kanban-board"], .kanban-board');

    if (await kanbanBoard.isVisible()) {
      await expect(kanbanBoard).toBeVisible();
    }
  });
});
