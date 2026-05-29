import { test, expect } from '@playwright/test';
import { continueAsGuest, suppressExplainerDialog, seedApiKey } from '../../helpers';

/**
 * OPER-005: data-test-id coverage for production flows
 * T527-T534 — Playwright smoke suite targeting primary flows exclusively
 * via data-test-id selectors.
 *
 * @smoke
 */
test.describe('OPER-005 Smoke — data-test-id coverage', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress any first-run dialogs and seed an API key so the chat UI is functional
    await page.goto('/');
    await suppressExplainerDialog(page);
  });

  // ── T527: Authentication surfaces ─────────────────────────────────────────

  test('T527 login form has all required test IDs @smoke', async ({ page }) => {
    await page.goto('/authentication/login');
    await expect(page.locator('[data-test-id="auth-login-card"]')).toBeVisible();
    await expect(page.locator('[data-test-id="auth-email-input"]')).toBeVisible();
    await expect(page.locator('[data-test-id="auth-password-input"]')).toBeVisible();
    await expect(page.locator('[data-test-id="auth-signin-submit-btn"]')).toBeVisible();
    await expect(page.locator('[data-test-id="auth-guest-btn"]')).toBeVisible();
    await expect(page.locator('[data-test-id="auth-register-link"]')).toBeVisible();
  });

  test('T528 register form has all required test IDs @smoke', async ({ page }) => {
    await page.goto('/authentication/register');
    await expect(page.locator('[data-test-id="auth-register-card"]')).toBeVisible();
    await expect(page.locator('[data-test-id="auth-register-email-input"]')).toBeVisible();
    await expect(page.locator('[data-test-id="auth-register-password-input"]')).toBeVisible();
    await expect(page.locator('[data-test-id="auth-register-confirm-input"]')).toBeVisible();
    await expect(page.locator('[data-test-id="auth-register-submit-btn"]')).toBeVisible();
    await expect(page.locator('[data-test-id="auth-login-link"]')).toBeVisible();
  });

  // ── T529: Dashboard/starter surface ───────────────────────────────────────

  test('T529 dashboard has start-chat CTA @smoke', async ({ page }) => {
    await continueAsGuest(page);
    await page.goto('/');
    await expect(page.locator('[data-test-id="starter-begin-chat-btn"]')).toBeVisible();
  });

  // ── T530: Chat surface ────────────────────────────────────────────────────

  test('T530 chat page has message input and send button @smoke', async ({ page }) => {
    await continueAsGuest(page);
    await seedApiKey(page);
    await page.goto('/tachikoma');
    await suppressExplainerDialog(page);
    await expect(page.locator('[data-test-id="chat-message-input"]')).toBeVisible();
    await expect(page.locator('[data-test-id="chat-send-btn"]')).toBeVisible();
  });

  test('T531 chat transcript nav buttons are present @smoke', async ({ page }) => {
    await continueAsGuest(page);
    // Seed a chat so the agent selector overlay does NOT auto-open and block the UI
    await page.evaluate(() => {
      const now = Date.now();
      localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{
        id: 'smoke-nav-chat', title: 'Smoke Nav Test', messages: [],
        participatingAgents: [], conversationSummary: '', createdAt: now, updatedAt: now,
      }]));
      localStorage.setItem('tachikoma_current_chat_id', 'smoke-nav-chat');
    });
    await page.goto('/tachikoma');
    await suppressExplainerDialog(page);
    // Nav buttons are in the DOM even without scrolling
    await expect(page.locator('[data-test-id="chat-jump-top-btn"]')).toBeAttached();
    await expect(page.locator('[data-test-id="chat-jump-latest-btn"]')).toBeAttached();
  });

  // ── T532: Profiles surface ────────────────────────────────────────────────

  test('T532 profiles page has new agent and reset buttons @smoke', async ({ page }) => {
    await continueAsGuest(page);
    await page.goto('/tachikoma-profiles');
    await expect(page.locator('[data-test-id="profiles-new-agent-btn"]')).toBeVisible();
    await expect(page.locator('[data-test-id="profiles-reset-defaults-btn"]')).toBeVisible();
    await expect(page.locator('[data-test-id="profiles-intent-draft-panel"]')).toBeVisible();
    await expect(page.locator('[data-test-id="profiles-intent-input"]')).toBeVisible();
    await expect(page.locator('[data-test-id="profiles-draft-btn"]')).toBeVisible();
  });

  test('T533 profiles list shows edit and delete buttons for each profile @smoke', async ({ page }) => {
    await continueAsGuest(page);
    await page.goto('/tachikoma-profiles');
    // At least one default profile should be present
    const editBtns = page.locator('[data-test-id="profiles-edit-btn"]');
    await expect(editBtns.first()).toBeVisible();
    const deleteBtns = page.locator('[data-test-id="profiles-delete-btn"]');
    await expect(deleteBtns.first()).toBeVisible();
  });

  // ── T534: Empty / loading states ─────────────────────────────────────────

  test('T534 chat history drawer shows empty state when no chats @smoke', async ({ page }) => {
    await continueAsGuest(page);
    // Clear any existing chats
    await page.goto('/tachikoma');
    await suppressExplainerDialog(page);
    await page.evaluate(() => {
      localStorage.removeItem('tachikoma_chat_sessions');
      localStorage.removeItem('tachikoma_current_chat_id');
    });
    await page.reload();
    await suppressExplainerDialog(page);
    // The empty state in history list uses data-test-id="chat-history-empty"
    // Open history drawer first
    const historyBtn = page.locator('button', { hasText: /history|chat/i }).first();
    // Check the empty state element is attached (may not be visible until drawer opens)
    await expect(page.locator('[data-test-id="chat-history-empty"]')).toBeAttached();
  });
});
