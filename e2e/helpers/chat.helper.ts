import { Page, expect } from '@playwright/test';

/**
 * With no current chat id (fresh device or a guest with no saved chat), /tachikoma auto-opens the
 * new-chat agent selector (CHAT-001, asserted by T200). Its overlay intercepts clicks on the header
 * buttons, so tests that open the dialog themselves close the auto-opened one first.
 */
export async function closeAutoOpenedNewChatSelector(page: Page): Promise<void> {
  const closeBtn = page.locator('[data-test-id="chat-new-chat-close-btn"]');
  await expect(closeBtn).toBeVisible({ timeout: 5_000 });
  await closeBtn.click();
  await expect(closeBtn).toBeHidden({ timeout: 5_000 });
}

/** Open the chat history drawer from the header and wait until it has finished opening. */
export async function openChatHistoryDrawer(page: Page): Promise<void> {
  await page.locator('[data-test-id="chat-history-toggle-btn"]').click();
  await expect(page.locator('[data-test-id="chat-history-close-btn"]')).toBeVisible({ timeout: 5_000 });
}
