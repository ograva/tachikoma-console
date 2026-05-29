import { test, expect } from '@playwright/test';
import {
  signInWithEmail,
  continueAsGuest,
  createEmulatorUser,
  clearEmulatorAuth,
  SEED_USER,
  suppressExplainerDialog,
  clearLocalStorage,
  getLocalStorageJson,
} from '../../helpers';

/**
 * AUTH-001: Sign In and Resume (T000-T009)
 * AUTH-002: Save API Credentials Safely (T010-T014)
 * AUTH-003: Choose First-Login Sync Strategy (T020-T026)
 */
test.describe('AUTH — Identity and Secure Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page).catch(() => {});
  });

  // ══ AUTH-001: Sign In and Resume (T000-T004) ══════════════════════════════

  test.describe('T000-T004 Sign-in flows', () => {
    test('T000 anonymous/guest path lands user in the app @smoke', async ({ page }) => {
      await continueAsGuest(page);
      // Should be on a non-auth route
      await expect(page).not.toHaveURL(/authentication/);
    });

    test('T001 email/password sign-in succeeds with valid credentials', async ({ page }) => {
      // Ensure test user exists
      await createEmulatorUser(SEED_USER.email, SEED_USER.password).catch(() => {});
      await signInWithEmail(page);
      await expect(page).not.toHaveURL(/authentication/);
    });

    test('T002 failed sign-in shows error message', async ({ page }) => {
      await page.goto('/authentication/login');
      await page.locator('[data-test-id="auth-email-input"]').fill('bad@example.com');
      await page.locator('[data-test-id="auth-password-input"]').fill('wrongpassword');
      await page.locator('[data-test-id="auth-signin-submit-btn"]').click();
      await expect(page.locator('[data-test-id="auth-error-message"]')).toBeVisible({ timeout: 6_000 });
    });

    test('T003 session persists across page reload', async ({ page }) => {
      await createEmulatorUser(SEED_USER.email, SEED_USER.password).catch(() => {});
      await signInWithEmail(page);
      const urlBefore = page.url();
      await page.reload();
      await suppressExplainerDialog(page);
      // Should still be authenticated (not redirected to login)
      await expect(page).not.toHaveURL(/authentication/);
      expect(page.url()).toBe(urlBefore);
    });

    test('T004 anonymous user local data is preserved after refresh', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma-profiles');
      // Default profiles should be present
      const profiles = await getLocalStorageJson<any[]>(page, 'tachikoma_agent_profiles');
      expect(profiles?.length).toBeGreaterThan(0);

      await page.reload();
      const profilesAfter = await getLocalStorageJson<any[]>(page, 'tachikoma_agent_profiles');
      expect(profilesAfter?.length).toBeGreaterThan(0);
    });
  });

  // ══ AUTH-001: Logout (T005-T009) ════════════════════════════════════════

  test.describe('T005-T009 Logout behavior', () => {
    test('T005 logout clears local session data', async ({ page }) => {
      await createEmulatorUser(SEED_USER.email, SEED_USER.password).catch(() => {});
      await signInWithEmail(page);

      // Write something to localStorage to verify it gets cleared
      await page.evaluate(() => {
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{ id: 'test-chat' }]));
      });

      // Find and click logout
      await page.locator('button[aria-label="Profile"]').click().catch(async () => {
        // Try alternative header menu trigger
        await page.locator('button:has(mat-icon)').filter({ hasText: '' }).first().click();
      });
      const logoutBtn = page.locator('button', { hasText: /logout|sign out/i }).first();
      await logoutBtn.click();

      await page.waitForURL(/authentication/, { timeout: 8_000 });

      // Navigate back and check local data is cleared
      await page.goto('/');
      const sessions = await getLocalStorageJson(page, 'tachikoma_chat_sessions');
      expect(sessions).toBeNull();
    });

    test('T006 logout redirects to authentication page', async ({ page }) => {
      await createEmulatorUser(SEED_USER.email, SEED_USER.password).catch(() => {});
      await signInWithEmail(page);
      await page.locator('button[aria-label="Profile"]').click().catch(async () => {
        await page.locator('[mat-icon-button]').filter({ hasText: '' }).first().click();
      });
      await page.locator('button', { hasText: /logout|sign out/i }).first().click();
      await expect(page).toHaveURL(/authentication/, { timeout: 8_000 });
    });
  });

  // ══ AUTH-002: API Credentials (T010-T014) ════════════════════════════════

  test.describe('T010-T014 API credentials', () => {
    test('T010 API key input is present in chat header when unauthenticated', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);
      // The API key input should be visible in the header
      const apiInput = page.locator('input[type="password"]').filter({ hasText: '' }).first();
      await expect(apiInput).toBeVisible({ timeout: 5_000 });
    });

    test('T011 entering a valid API key saves and shows the initialized state', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);
      const apiInput = page.locator('input[type="password"]').first();
      await apiInput.fill('AIzaSy-test-key-abc123');
      const initBtn = page.locator('button', { hasText: /initialize/i }).first();
      await initBtn.click();
      // The app should now have a key in localStorage
      const stored = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
      expect(stored).toBeTruthy();
    });

    test('T012 empty API key shows validation feedback', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);
      const apiInput = page.locator('input[type="password"]').first();
      await apiInput.fill('   ');
      const initBtn = page.locator('button', { hasText: /initialize/i }).first();
      await initBtn.click();
      // Should show invalid key feedback (either dialog or alert)
      const dialog = page.locator('mat-dialog-container, [role="alertdialog"]');
      await expect(dialog).toBeVisible({ timeout: 5_000 });
    });

    test('T013 API key persists across reload for guest users', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);
      await page.evaluate(() => localStorage.setItem('gemini_api_key', 'AIzaSy-persisted-key'));
      await page.reload();
      await suppressExplainerDialog(page);
      const stored = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
      expect(stored).toBe('AIzaSy-persisted-key');
    });

    test('T014 malformed API key (with non-ASCII chars) is sanitized before save', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);
      const apiInput = page.locator('input[type="password"]').first();
      // Inject key with non-ASCII characters via JS to bypass input sanitization
      await apiInput.evaluate((el, v) => { (el as HTMLInputElement).value = v; el.dispatchEvent(new Event('input')); }, 'AIzaSy-​test‌-key');
      const initBtn = page.locator('button', { hasText: /initialize/i }).first();
      await initBtn.click();
      const stored = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
      // Non-ASCII characters should have been stripped
      if (stored) {
        expect(stored).not.toContain('​');
        expect(stored).not.toContain('‌');
      }
    });
  });

  // ══ AUTH-003: First-Login Sync Strategy (T020-T026) ══════════════════════

  test.describe('T020-T026 First-login sync strategy', () => {
    test('T020 sync dialog appears on first authenticated login when local data exists', async ({ page }) => {
      // Pre-seed local data
      await page.goto('/authentication/login');
      await page.evaluate(() => {
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{
          id: 'local-chat-1', title: 'Local Chat', messages: [],
          participatingAgents: [], conversationSummary: '',
          createdAt: Date.now(), updatedAt: Date.now(),
        }]));
      });

      const { email, password } = SEED_USER;
      await createEmulatorUser(email, password).catch(() => {});

      await page.locator('[data-test-id="auth-email-input"]').fill(email);
      await page.locator('[data-test-id="auth-password-input"]').fill(password);
      await page.locator('[data-test-id="auth-signin-submit-btn"]').click();

      // The sync dialog should appear
      const syncDialog = page.locator('app-sync-dialog, .sync-dialog');
      await expect(syncDialog).toBeVisible({ timeout: 10_000 });
    });

    test('T021 sync dialog presents three strategy options', async ({ page }) => {
      await page.goto('/authentication/login');
      await page.evaluate(() => {
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{ id: 'c1', title: 'T', messages: [], participatingAgents: [], conversationSummary: '', createdAt: 1, updatedAt: 1 }]));
      });
      await createEmulatorUser(SEED_USER.email, SEED_USER.password).catch(() => {});
      await page.locator('[data-test-id="auth-email-input"]').fill(SEED_USER.email);
      await page.locator('[data-test-id="auth-password-input"]').fill(SEED_USER.password);
      await page.locator('[data-test-id="auth-signin-submit-btn"]').click();

      const syncDialog = page.locator('app-sync-dialog, .sync-dialog');
      await expect(syncDialog).toBeVisible({ timeout: 10_000 });

      // Three option cards
      const optionCards = syncDialog.locator('.option-card');
      await expect(optionCards).toHaveCount(3);
    });

    test('T022 selecting merge strategy closes dialog and continues', async ({ page }) => {
      await page.goto('/authentication/login');
      await page.evaluate(() => {
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{ id: 'c1', title: 'T', messages: [], participatingAgents: [], conversationSummary: '', createdAt: 1, updatedAt: 1 }]));
      });
      await createEmulatorUser(SEED_USER.email, SEED_USER.password).catch(() => {});
      await page.locator('[data-test-id="auth-email-input"]').fill(SEED_USER.email);
      await page.locator('[data-test-id="auth-password-input"]').fill(SEED_USER.password);
      await page.locator('[data-test-id="auth-signin-submit-btn"]').click();

      const syncDialog = page.locator('app-sync-dialog, .sync-dialog');
      await expect(syncDialog).toBeVisible({ timeout: 10_000 });

      // Click "Merge Data" option
      await syncDialog.locator('.option-card').first().click();

      // Dialog should close
      await expect(syncDialog).not.toBeVisible({ timeout: 5_000 });
    });

    test('T023 skip-for-now closes sync dialog without performing sync', async ({ page }) => {
      await page.goto('/authentication/login');
      await page.evaluate(() => {
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{ id: 'c1', title: 'T', messages: [], participatingAgents: [], conversationSummary: '', createdAt: 1, updatedAt: 1 }]));
      });
      await createEmulatorUser(SEED_USER.email, SEED_USER.password).catch(() => {});
      await page.locator('[data-test-id="auth-email-input"]').fill(SEED_USER.email);
      await page.locator('[data-test-id="auth-password-input"]').fill(SEED_USER.password);
      await page.locator('[data-test-id="auth-signin-submit-btn"]').click();

      const syncDialog = page.locator('app-sync-dialog, .sync-dialog');
      await expect(syncDialog).toBeVisible({ timeout: 10_000 });

      await syncDialog.locator('.cancel-btn, button:has-text("Skip")').click();
      await expect(syncDialog).not.toBeVisible({ timeout: 5_000 });
    });

    test('T024 sync dialog does not appear when no local data exists', async ({ page }) => {
      // Don't seed any local data
      await page.goto('/authentication/login');
      await createEmulatorUser(SEED_USER.email, SEED_USER.password).catch(() => {});
      await page.locator('[data-test-id="auth-email-input"]').fill(SEED_USER.email);
      await page.locator('[data-test-id="auth-password-input"]').fill(SEED_USER.password);
      await page.locator('[data-test-id="auth-signin-submit-btn"]').click();

      // Wait for navigation to complete, then confirm no sync dialog appeared
      await page.waitForURL((url) => !url.pathname.includes('/authentication'), { timeout: 10_000 });
      const syncDialog = page.locator('app-sync-dialog, .sync-dialog');
      await expect(syncDialog).not.toBeVisible();
    });
  });
});
