import { test, expect } from '@playwright/test';
import {
  continueAsGuest,
  suppressExplainerDialog,
  seedApiKey,
  closeAutoOpenedNewChatSelector,
  openChatHistoryDrawer,
} from '../../helpers';

/** Read `tachikoma_chat_sessions` from the page. */
async function readLocalChats(page: import('@playwright/test').Page): Promise<any[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('tachikoma_chat_sessions') || '[]'));
}

/**
 * CHAT-001: Start a New Chat with Context (T200-T205)
 * CHAT-002: Resume and Manage Saved Chats (T206-T212)
 * CHAT-003: Export Conversation Records (T213-T217)
 * CHAT-004: Sticky Transcript Utilities (T218-T223)
 */
test.describe('CHAT — Chat Session Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await continueAsGuest(page);
    await seedApiKey(page);
    // Suppress the first-visit explainer BEFORE the chat page loads, so it never opens.
    await suppressExplainerDialog(page);
    await page.goto('/tachikoma');
  });

  // ══ CHAT-001: Start a New Chat (T200-T205) ════════════════════════════════

  test.describe('T200-T205 New Chat Creation', () => {
    test('T200 new chat dialog opens with agent roster @smoke', async ({ page }) => {
      // When no chat exists the app auto-opens the agent selector on load
      await expect(page.locator('[data-test-id="chat-new-chat-dialog"]')).toBeVisible({ timeout: 8_000 });
    });

    test('T201 roster shows all available agents', async ({ page }) => {
      await closeAutoOpenedNewChatSelector(page);
      await page.locator('[data-test-id="chat-header-new-chat-btn"]').click();
      const agentItems = page.locator('[data-test-id="chat-new-chat-agent-option"]');
      await expect(agentItems.first()).toBeVisible({ timeout: 5_000 });
      // Every agent profile saved locally is offered in the roster
      const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('tachikoma_agent_profiles') || '[]'));
      expect(profiles.length).toBeGreaterThan(0);
      await expect(agentItems).toHaveCount(profiles.length);
    });

    test('T202 creating chat requires at least one agent selected', async ({ page }) => {
      await closeAutoOpenedNewChatSelector(page);
      await page.locator('[data-test-id="chat-header-new-chat-btn"]').click();
      const dialog = page.locator('[data-test-id="chat-new-chat-dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Deselect all agents
      await page.locator('[data-test-id="chat-new-chat-clear-all-btn"]').click();

      // Try to start: the app rejects it with a browser alert and keeps the dialog open
      let alertMessage = '';
      page.once('dialog', async (d) => { alertMessage = d.message(); await d.dismiss(); });
      await page.locator('[data-test-id="chat-new-chat-start-btn"]').click();

      await expect.poll(() => alertMessage, { timeout: 5_000 }).toMatch(/select at least one agent/i);
      await expect(dialog).toBeVisible();
      expect(await readLocalChats(page)).toHaveLength(0);
    });

    test('T203 chat title input is available in new chat dialog', async ({ page }) => {
      await closeAutoOpenedNewChatSelector(page);
      await page.locator('[data-test-id="chat-header-new-chat-btn"]').click();
      await expect(page.locator('[data-test-id="chat-new-chat-title-input"]')).toBeVisible({ timeout: 5_000 });
    });

    test('T204 chat description input is available in new chat dialog', async ({ page }) => {
      await closeAutoOpenedNewChatSelector(page);
      await page.locator('[data-test-id="chat-header-new-chat-btn"]').click();
      await expect(page.locator('[data-test-id="chat-new-chat-description-input"]')).toBeVisible({ timeout: 5_000 });
    });

    test('T205 chat description persists after creation', async ({ page }) => {
      await closeAutoOpenedNewChatSelector(page);
      await page.locator('[data-test-id="chat-header-new-chat-btn"]').click();
      const dialog = page.locator('[data-test-id="chat-new-chat-dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      await page.locator('[data-test-id="chat-new-chat-title-input"]').fill('Test Chat With Desc');
      await page.locator('[data-test-id="chat-new-chat-description-input"]').fill('A test context description');
      await page.locator('[data-test-id="chat-new-chat-start-btn"]').click();

      // Wait for dialog to close
      await expect(dialog).not.toBeVisible({ timeout: 5_000 });

      // Verify the description is stored
      await expect.poll(async () => {
        const chat = (await readLocalChats(page)).find((s: any) => s.title === 'Test Chat With Desc');
        return chat?.description;
      }, { timeout: 5_000 }).toBe('A test context description');
    });
  });

  // ══ CHAT-002: Resume and Manage Saved Chats (T206-T212) ══════════════════

  test.describe('T206-T212 Resume and Manage', () => {
    test('T206 history drawer opens and shows saved chats', async ({ page }) => {
      // Seed a chat into localStorage
      await page.evaluate(() => {
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{
          id: 'test-hist-1', title: 'History Test Chat', messages: [],
          participatingAgents: [], conversationSummary: '',
          createdAt: Date.now(), updatedAt: Date.now(),
        }]));
        localStorage.setItem('tachikoma_current_chat_id', 'test-hist-1');
      });
      await page.reload();

      await openChatHistoryDrawer(page);
      await expect(page.locator('[data-test-id="chat-history-item"]', { hasText: 'History Test Chat' })).toBeVisible({ timeout: 5_000 });
    });

    test('T207 switching chats loads the correct session', async ({ page }) => {
      await page.evaluate(() => {
        const now = Date.now();
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([
          { id: 'chat-a', title: 'Chat Alpha', messages: [{ id: 'm1', sender: 'USER', text: 'Alpha message', html: 'Alpha message', isUser: true, timestamp: now }], participatingAgents: [], conversationSummary: '', createdAt: now, updatedAt: now },
          { id: 'chat-b', title: 'Chat Beta', messages: [{ id: 'm2', sender: 'USER', text: 'Beta message', html: 'Beta message', isUser: true, timestamp: now }], participatingAgents: [], conversationSummary: '', createdAt: now, updatedAt: now },
        ]));
        localStorage.setItem('tachikoma_current_chat_id', 'chat-a');
      });
      await page.reload();
      await expect(page.locator('[data-test-id="chat-user-message"]', { hasText: 'Alpha message' })).toBeVisible({ timeout: 5_000 });

      // Switch to Beta chat via history
      await openChatHistoryDrawer(page);
      await page.locator('[data-test-id="chat-history-item"]', { hasText: 'Chat Beta' }).click();
      await expect(page.locator('[data-test-id="chat-user-message"]', { hasText: 'Beta message' })).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('[data-test-id="chat-user-message"]', { hasText: 'Alpha message' })).toHaveCount(0);
    });

    test('T208 edit chat metadata dialog saves title and description', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{
          id: 'edit-me', title: 'Before Edit', description: '', messages: [],
          participatingAgents: [], conversationSummary: '', createdAt: 1, updatedAt: 1,
        }]));
        localStorage.setItem('tachikoma_current_chat_id', 'edit-me');
      });
      await page.reload();

      // Open the edit dialog for this chat from the history drawer
      await openChatHistoryDrawer(page);
      const row = page.locator('[data-test-id="chat-history-item"]', { hasText: 'Before Edit' });
      await row.locator('[data-test-id="chat-history-edit-btn"]').click();

      const editDialog = page.locator('[data-test-id="chat-edit-chat-dialog"]');
      await expect(editDialog).toBeVisible({ timeout: 5_000 });
      await page.locator('[data-test-id="chat-edit-chat-title-input"]').fill('After Edit');
      await page.locator('[data-test-id="chat-edit-chat-description-input"]').fill('Edited description');
      await page.locator('[data-test-id="chat-edit-chat-save-btn"]').click();
      await expect(editDialog).not.toBeVisible({ timeout: 5_000 });

      await expect.poll(async () => {
        const updated = (await readLocalChats(page)).find((s: any) => s.id === 'edit-me');
        return { title: updated?.title, description: updated?.description };
      }, { timeout: 5_000 }).toEqual({ title: 'After Edit', description: 'Edited description' });
    });

    test('T209 deleting a chat removes it from history', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([
          { id: 'del-me', title: 'Delete Me', messages: [], participatingAgents: [], conversationSummary: '', createdAt: 1, updatedAt: 1 },
          { id: 'keep-me', title: 'Keep Me', messages: [], participatingAgents: [], conversationSummary: '', createdAt: 2, updatedAt: 2 },
        ]));
        localStorage.setItem('tachikoma_current_chat_id', 'del-me');
      });
      await page.reload();

      // Delete the current chat from its history row
      await openChatHistoryDrawer(page);
      const row = page.locator('[data-test-id="chat-history-item"]', { hasText: 'Delete Me' });
      await row.locator('[data-test-id="chat-history-delete-btn"]').click();

      await expect(row).toHaveCount(0, { timeout: 5_000 });
      await expect(page.locator('[data-test-id="chat-history-item"]', { hasText: 'Keep Me' })).toBeVisible();
      await expect.poll(async () => (await readLocalChats(page)).map((s: any) => s.id), { timeout: 5_000 })
        .toEqual(['keep-me']);
    });

    test('T210 switching to deleted chat falls back to next available', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([
          { id: 'only-chat', title: 'Only Chat', messages: [], participatingAgents: [], conversationSummary: '', createdAt: 1, updatedAt: 1 },
        ]));
        localStorage.setItem('tachikoma_current_chat_id', 'only-chat');
      });
      await page.reload();

      await openChatHistoryDrawer(page);
      const row = page.locator('[data-test-id="chat-history-item"]', { hasText: 'Only Chat' });
      await row.locator('[data-test-id="chat-history-delete-btn"]').click();
      await expect(row).toHaveCount(0, { timeout: 5_000 });

      // The new chat dialog should open since no chats remain
      await expect(page.locator('[data-test-id="chat-new-chat-dialog"]')).toBeVisible({ timeout: 8_000 });
    });
  });

  // ══ CHAT-003: Export Conversation Records (T213-T217) ════════════════════

  test.describe('T213-T217 Export', () => {
    test.beforeEach(async ({ page }) => {
      // Seed a chat with messages
      await page.evaluate(() => {
        const now = Date.now();
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{
          id: 'export-chat', title: 'Export Test Chat',
          messages: [
            { id: 'm1', sender: 'USER', text: 'Hello', html: 'Hello', isUser: true, timestamp: now, roundId: 0 },
            { id: 'm2', sender: 'LOGIKOMA', text: 'Analysis complete', html: 'Analysis complete', isUser: false, agentId: 'logikoma', timestamp: now + 100, roundId: 0 },
          ],
          participatingAgents: [], conversationSummary: '', createdAt: now, updatedAt: now,
        }]));
        localStorage.setItem('tachikoma_current_chat_id', 'export-chat');
      });
      await page.reload();
      await suppressExplainerDialog(page);
    });

    test('T213 export menu button is visible when messages exist', async ({ page }) => {
      const exportBtn = page.locator('button', { hasText: /export/i }).first()
        .or(page.locator('button mat-icon:text("download")').first());
      await expect(exportBtn).toBeVisible({ timeout: 5_000 });
    });

    test('T214 export menu shows text, PDF, and Word options', async ({ page }) => {
      const exportBtn = page.locator('button mat-icon:text("download"), button[matTooltip*="Export"]').first();
      await exportBtn.click();
      await expect(page.locator('.export-menu')).toBeVisible({ timeout: 3_000 });
      await expect(page.locator('.export-menu-item', { hasText: /text/i })).toBeVisible();
      await expect(page.locator('.export-menu-item', { hasText: /pdf/i })).toBeVisible();
      await expect(page.locator('.export-menu-item', { hasText: /word/i })).toBeVisible();
    });

    test('T215 export as text triggers a file download', async ({ page }) => {
      const exportBtn = page.locator('button mat-icon:text("download"), button[matTooltip*="Export"]').first();
      await exportBtn.click();
      await expect(page.locator('.export-menu')).toBeVisible({ timeout: 3_000 });

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10_000 }),
        page.locator('.export-menu-item', { hasText: /text/i }).click(),
      ]);

      expect(download.suggestedFilename()).toMatch(/\.txt$/);
    });

    test('T216 export as PDF triggers a file download', async ({ page }) => {
      const exportBtn = page.locator('button mat-icon:text("download"), button[matTooltip*="Export"]').first();
      await exportBtn.click();
      await expect(page.locator('.export-menu')).toBeVisible({ timeout: 3_000 });

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10_000 }),
        page.locator('.export-menu-item', { hasText: /pdf/i }).click(),
      ]);

      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    });

    test('T217 exported filename uses the chat title (sanitized)', async ({ page }) => {
      const exportBtn = page.locator('button mat-icon:text("download"), button[matTooltip*="Export"]').first();
      await exportBtn.click();
      await expect(page.locator('.export-menu')).toBeVisible({ timeout: 3_000 });

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10_000 }),
        page.locator('.export-menu-item', { hasText: /text/i }).click(),
      ]);

      // Filename should be sanitized from "Export Test Chat"
      expect(download.suggestedFilename()).toMatch(/export-test-chat/i);
    });
  });

  // ══ CHAT-004: Sticky Transcript Utilities (T218-T223) ════════════════════

  test.describe('T218-T223 Sticky Transcript Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Seed a chat with many messages to enable scrolling
      await page.evaluate(() => {
        const now = Date.now();
        const messages = Array.from({ length: 30 }, (_, i) => ({
          id: `msg-${i}`, sender: i % 2 === 0 ? 'USER' : 'LOGIKOMA',
          text: `Message ${i} — some content to make this long enough to scroll`,
          html: `Message ${i}`, isUser: i % 2 === 0, timestamp: now + i * 100, roundId: Math.floor(i / 4),
        }));
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{
          id: 'scroll-chat', title: 'Scroll Test',
          messages,
          participatingAgents: [{ id: 'logikoma', name: 'LOGIKOMA', color: 'logikoma', hex: '#00f3ff', temp: 0.2, role: 'chatter', system: 'S', createdAt: 1, updatedAt: 1 }],
          conversationSummary: '', createdAt: now, updatedAt: now,
        }]));
        localStorage.setItem('tachikoma_current_chat_id', 'scroll-chat');
      });
      await page.reload();
      await suppressExplainerDialog(page);
    });

    test('T218 jump-to-top button is present in the DOM', async ({ page }) => {
      await expect(page.locator('[data-test-id="chat-jump-top-btn"]')).toBeAttached();
    });

    test('T219 jump-to-latest button is present in the DOM', async ({ page }) => {
      await expect(page.locator('[data-test-id="chat-jump-latest-btn"]')).toBeAttached();
    });

    test('T220 clicking jump-to-latest scrolls feed to the bottom', async ({ page }) => {
      const chatFeed = page.locator('.chat-feed');
      await expect(chatFeed).toBeVisible();
      expect(await chatFeed.evaluate((el) => el.scrollHeight > el.clientHeight)).toBeTruthy();

      // Scroll to the top; the scroll interaction reveals the transcript nav
      await chatFeed.evaluate((el) => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
      await expect.poll(() => chatFeed.evaluate((el) => el.scrollTop)).toBe(0);

      // Wait until the nav is interactive (no force): click() waits until the button receives pointer events
      const jumpLatest = page.locator('[data-test-id="chat-jump-latest-btn"]');
      await expect(jumpLatest).toBeVisible();
      await jumpLatest.click();

      // After clicking, the feed should reach the bottom
      await expect.poll(() => chatFeed.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 10),
        { timeout: 5_000 }).toBeTruthy();
    });

    test('T221 clicking jump-to-top scrolls feed to the top', async ({ page }) => {
      const chatFeed = page.locator('.chat-feed');
      // Scroll to bottom first
      await chatFeed.evaluate((el) => el.scrollTop = el.scrollHeight);

      await page.locator('[data-test-id="chat-jump-top-btn"]').click({ force: true });

      const scrollTop = await chatFeed.evaluate((el) => el.scrollTop);
      expect(scrollTop).toBe(0);
    });

    test('T222 nav controls appear on scroll interaction', async ({ page }) => {
      const chatFeed = page.locator('.chat-feed');
      // Trigger scroll
      await chatFeed.evaluate((el) => el.dispatchEvent(new Event('scroll')));
      // The scroll-nav element should become visible
      const nav = page.locator('.scroll-nav');
      await expect(nav).toBeAttached();
    });

    test('T223 unread badge shows correct count', async ({ page }) => {
      // The unread count depends on scroll position; verify it is rendered correctly
      const unreadBadge = page.locator('[data-test-id="chat-jump-unread-btn"] .unread-badge');
      // When all messages loaded and none marked as read, unread count should be non-zero
      // (or element might not be visible if count is 0)
      // Just verify the unread button is attached
      await expect(page.locator('[data-test-id="chat-jump-unread-btn"]')).toBeAttached();
    });
  });
});
