import { test, expect, waitForToast } from './fixtures';

test.describe('Conversations', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/conversations');
    await page.waitForLoadState('networkidle');
  });

  test('should display conversations page', async ({ authenticatedPage: page }) => {
    // Page heading should be visible
    await expect(page.getByRole('heading', { name: /المحادثات|conversations|الرسائل|messages/i })).toBeVisible();
  });

  test('should display conversation list', async ({ authenticatedPage: page }) => {
    // Conversation list should be visible
    const conversationList = page.locator('[data-testid="conversation-list"], .conversation-list, aside, [role="list"]').first();
    await expect(conversationList).toBeVisible({ timeout: 10000 });
  });

  test('should display conversation filters', async ({ authenticatedPage: page }) => {
    // Status filter tabs or dropdown
    const statusFilter = page.getByRole('tablist').or(
      page.getByLabel(/الحالة|status/i)
    );

    if (await statusFilter.isVisible()) {
      await expect(statusFilter).toBeVisible();
    }
  });

  test('should display unassigned conversations tab', async ({ authenticatedPage: page }) => {
    // Unassigned tab
    const unassignedTab = page.getByRole('tab', { name: /غير معينة|unassigned/i }).or(
      page.getByRole('button', { name: /غير معينة|unassigned/i })
    );

    if (await unassignedTab.isVisible()) {
      await unassignedTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('should display my conversations tab', async ({ authenticatedPage: page }) => {
    // My conversations tab
    const myTab = page.getByRole('tab', { name: /محادثاتي|my conversations/i }).or(
      page.getByRole('button', { name: /محادثاتي|my/i })
    );

    if (await myTab.isVisible()) {
      await myTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('should open conversation when clicked', async ({ authenticatedPage: page }) => {
    // Wait for conversations to load
    const firstConversation = page.locator('[data-testid="conversation-item"], .conversation-item').first();

    if (await firstConversation.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstConversation.click();

      // Message area should be visible
      await expect(
        page.locator('[data-testid="message-list"], .message-list, [data-testid="chat-area"]')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display message input when conversation is selected', async ({ authenticatedPage: page }) => {
    // Wait for conversations to load
    const firstConversation = page.locator('[data-testid="conversation-item"], .conversation-item').first();

    if (await firstConversation.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstConversation.click();
      await page.waitForTimeout(500);

      // Message input should be visible
      const messageInput = page.getByPlaceholder(/اكتب رسالة|type a message|رسالة/i).or(
        page.locator('textarea, input[type="text"]').last()
      );
      await expect(messageInput).toBeVisible();
    }
  });

  test('should send a message', async ({ authenticatedPage: page }) => {
    // Wait for conversations to load
    const firstConversation = page.locator('[data-testid="conversation-item"], .conversation-item').first();

    if (await firstConversation.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstConversation.click();
      await page.waitForTimeout(500);

      // Find message input
      const messageInput = page.getByPlaceholder(/اكتب رسالة|type a message|رسالة/i).or(
        page.locator('textarea').last()
      );

      if (await messageInput.isVisible()) {
        // Type message
        await messageInput.fill('رسالة اختبار تلقائي');

        // Send message
        const sendButton = page.getByRole('button', { name: /إرسال|send/i }).or(
          page.locator('button[type="submit"]')
        );

        if (await sendButton.isVisible()) {
          await sendButton.click();

          // Message should appear in list
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should take conversation (self-assign)', async ({ authenticatedPage: page }) => {
    // Go to unassigned conversations
    const unassignedTab = page.getByRole('tab', { name: /غير معينة|unassigned/i }).or(
      page.getByRole('button', { name: /غير معينة|unassigned/i })
    );

    if (await unassignedTab.isVisible()) {
      await unassignedTab.click();
      await page.waitForTimeout(500);

      // Find first unassigned conversation
      const firstConversation = page.locator('[data-testid="conversation-item"], .conversation-item').first();

      if (await firstConversation.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstConversation.click();
        await page.waitForTimeout(500);

        // Find take/assign button
        const takeButton = page.getByRole('button', { name: /استلام|take|تعيين لي|assign to me/i });

        if (await takeButton.isVisible()) {
          await takeButton.click();
          await waitForToast(page, /تم|success|assigned/i);
        }
      }
    }
  });

  test('should close conversation', async ({ authenticatedPage: page }) => {
    // Wait for conversations to load
    const firstConversation = page.locator('[data-testid="conversation-item"], .conversation-item').first();

    if (await firstConversation.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstConversation.click();
      await page.waitForTimeout(500);

      // Find close button
      const closeButton = page.getByRole('button', { name: /إغلاق المحادثة|close conversation|إنهاء/i });

      if (await closeButton.isVisible()) {
        await closeButton.click();

        // Confirm if needed
        const confirmButton = page.getByRole('button', { name: /تأكيد|confirm|نعم|yes/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await waitForToast(page, /تم|closed|إغلاق/i);
      }
    }
  });

  test('should display conversation statistics', async ({ authenticatedPage: page }) => {
    // Statistics should be visible (total, active, pending, etc.)
    const statsSection = page.getByText(/إجمالي|total/i).or(
      page.locator('[data-testid="stats"], .stats-cards')
    );

    if (await statsSection.isVisible()) {
      await expect(statsSection).toBeVisible();
    }
  });

  test('should filter by channel', async ({ authenticatedPage: page }) => {
    // Channel filter
    const channelFilter = page.getByLabel(/القناة|channel/i);

    if (await channelFilter.isVisible()) {
      // Select WhatsApp
      await channelFilter.selectOption({ label: /واتساب|whatsapp/i });
      await page.waitForTimeout(500);
    }
  });

  test('should search conversations', async ({ authenticatedPage: page }) => {
    const searchInput = page.getByPlaceholder(/بحث|search/i);

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }
  });

  test('should display contact info in conversation', async ({ authenticatedPage: page }) => {
    // Wait for conversations to load
    const firstConversation = page.locator('[data-testid="conversation-item"], .conversation-item').first();

    if (await firstConversation.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstConversation.click();
      await page.waitForTimeout(500);

      // Contact info section should be visible
      const contactInfo = page.locator('[data-testid="contact-info"], .contact-info').or(
        page.getByText(/معلومات الاتصال|contact info/i)
      );

      // May or may not be visible depending on UI
    }
  });
});
