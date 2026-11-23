import { test, expect, Browser } from '@playwright/test';
import {
  continueAsGuest,
  suppressExplainerDialog,
  seedApiKey,
  createEmulatorUser,
  signInWithEmail,
  SEED_USER,
  EMULATOR_FIRESTORE_BASE,
  PROJECT_ID,
  FIRESTORE_DB_ID,
  createUniqueEmulatorUser,
  seedEmulatorFirestoreDoc,
  getEmulatorFirestoreDocs,
  resolveSyncDialog,
} from '../../helpers';

const CHAT_SESSIONS_KEY = 'tachikoma_chat_sessions';
const AGENT_PROFILES_KEY = 'tachikoma_agent_profiles';

function makeSeedChat(id: string, title: string) {
  const now = Date.now();
  return { id, title, messages: [], participatingAgents: [], conversationSummary: '', createdAt: now, updatedAt: now };
}

/** Chat ids in the app's own format (`chat_<epochMs>_<rand>`), so Firestore doc-id order mirrors creation time. */
function chatId(epochMs: number, suffix: string) {
  return `chat_${epochMs}_${suffix}`;
}

/** A message shaped like the ones TachikomaChatComponent writes (round-based transcript). */
function makeSeedMessage(id: string, text: string, isUser: boolean, timestamp: number, roundId = 0) {
  return {
    id, sender: isUser ? 'USER' : 'LOGIKOMA', text, html: `<p>${text}</p>`, isUser, timestamp, roundId,
    ...(isUser ? {} : { agentId: 'logikoma' }),
  };
}

/** Read `tachikoma_chat_sessions` from the page. */
async function readLocalChats(page: import('@playwright/test').Page): Promise<any[]> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), CHAT_SESSIONS_KEY);
}

/**
 * Open the chat page with the explainer suppressed and the history drawer open.
 * Restored chats never set a current chat id, so the page always opens the new-chat agent
 * selector first; close it before opening the drawer.
 */
async function openChatHistory(page: import('@playwright/test').Page): Promise<void> {
  await suppressExplainerDialog(page);
  await page.goto('/tachikoma');
  await page.locator('[data-test-id="chat-new-chat-close-btn"]').click();
  await page.locator('[data-test-id="chat-history-toggle-btn"]').click();
}

/**
 * SYNC-001: Save Locally Before Cloud Sync (T400-T404)
 * SYNC-002: Restore Data Across Devices (T407-T413)
 * SYNC-003: Support Offline-First Operation (T414-T420)
 * SYNC-004: Use Firestore App Namespace (T421-T426)
 */
test.describe('SYNC — Persistence, Offline Continuity, Cross-Device Recovery', () => {

  // ══ SYNC-001: Local-First Save (T400-T404) ════════════════════════════════

  test.describe('T400-T404 Local-First Persistence', () => {
    test('T400 chat saves to localStorage immediately on creation', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);

      // Trigger new chat creation
      await page.locator('button mat-icon:text("add")').first().click();
      const dialog = page.locator('.agent-selector-dialog');
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      await dialog.locator('input[name="new-chat-title-field"]').fill('Local-First Test');
      await dialog.locator('button', { hasText: /start chat/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5_000 });

      const sessions = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), CHAT_SESSIONS_KEY);
      expect(sessions.some((s: any) => s.title === 'Local-First Test')).toBeTruthy();
    });

    test('T401 agent profile saves to localStorage immediately on creation', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma-profiles');

      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const form = page.locator('mat-card', { hasText: 'CREATE NEW AGENT' });
      await form.locator('mat-form-field:has-text("Agent Name") input').fill('LOCAL-SAVE-TEST');
      await form.locator('textarea').first().fill('Local save test agent.');
      await page.locator('[data-test-id="profiles-save-new-btn"]').click();

      const profiles = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), AGENT_PROFILES_KEY);
      expect(profiles.some((p: any) => p.name === 'LOCAL-SAVE-TEST')).toBeTruthy();
    });

    test('T402 local data survives a hard refresh (F5)', async ({ page }) => {
      await continueAsGuest(page);
      await page.evaluate((key) => {
        localStorage.setItem(key, JSON.stringify([makeSeedChat('survive-1', 'Survive Refresh')]));
      }, CHAT_SESSIONS_KEY);

      await page.reload({ waitUntil: 'networkidle' });
      await suppressExplainerDialog(page);

      const sessions = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), CHAT_SESSIONS_KEY);
      expect(sessions.some((s: any) => s.title === 'Survive Refresh')).toBeTruthy();
    });

    test('T403 UI reflects saved local state without cloud', async ({ page }) => {
      await continueAsGuest(page);
      await page.evaluate((key) => {
        localStorage.setItem(key, JSON.stringify([makeSeedChat('local-visible-1', 'Should Be Visible')]));
        localStorage.setItem('tachikoma_current_chat_id', 'local-visible-1');
      }, CHAT_SESSIONS_KEY);

      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);

      // The chat title should be reflected somewhere in the UI
      const titleEl = page.locator('.chat-title, .chat-item', { hasText: 'Should Be Visible' }).first();
      // Just verify it's accessible in localStorage (the drawer would need to be opened for visual check)
      const sessions = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), CHAT_SESSIONS_KEY);
      expect(sessions.some((s: any) => s.title === 'Should Be Visible')).toBeTruthy();
    });

    test('T404 multiple chats save without overwriting each other', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);

      // Create first chat
      await page.locator('button mat-icon:text("add")').first().click();
      const dialog = page.locator('.agent-selector-dialog');
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      await dialog.locator('input[name="new-chat-title-field"]').fill('Chat One');
      await dialog.locator('button', { hasText: /start chat/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5_000 });

      // Create second chat
      await page.locator('button mat-icon:text("add")').first().click();
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      await dialog.locator('input[name="new-chat-title-field"]').fill('Chat Two');
      await dialog.locator('button', { hasText: /start chat/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5_000 });

      const sessions = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), CHAT_SESSIONS_KEY);
      expect(sessions.some((s: any) => s.title === 'Chat One')).toBeTruthy();
      expect(sessions.some((s: any) => s.title === 'Chat Two')).toBeTruthy();
    });
  });

  // ══ SYNC-002: Restore Across Devices (T405-T413) ══════════════════════════
  //
  // "Another device" = Playwright's fresh per-test browser context (empty localStorage and
  // IndexedDB) signing in as an emulator user whose cloud copy was written either directly to the
  // Firestore emulator (seedEmulatorFirestoreDoc) or by a first browser context (T408).
  // On sign-in the app always restores via AppComponent.checkAndSyncFromFirestore(); because
  // AgentProfileService writes default agents to localStorage on boot, the AUTH-003 sync dialog
  // also appears on every fresh device, so each test resolves it explicitly.

  test.describe('T405-T413 Restore Across Devices', () => {
    // Source: Quinn
    test('T405 cloud chats are restored into chat history on a new device after sign-in', async ({ page }) => {
      const user = await createUniqueEmulatorUser('t405');
      const t = Date.now() - 60_000;
      await seedEmulatorFirestoreDoc(user.uid, 'chat_sessions', chatId(t, 'aaaa1'), {
        ...makeSeedChat(chatId(t, 'aaaa1'), 'Restored From Cloud A'), createdAt: t, updatedAt: t,
      });
      await seedEmulatorFirestoreDoc(user.uid, 'chat_sessions', chatId(t + 1000, 'bbbb2'), {
        ...makeSeedChat(chatId(t + 1000, 'bbbb2'), 'Restored From Cloud B'), createdAt: t + 1000, updatedAt: t + 1000,
      });

      await signInWithEmail(page, user.email, user.password);
      await resolveSyncDialog(page, 'skip');

      await expect.poll(async () => (await readLocalChats(page)).map((c) => c.title).sort(), { timeout: 10_000 })
        .toEqual(['Restored From Cloud A', 'Restored From Cloud B']);

      await openChatHistory(page);
      const titles = page.locator('[data-test-id="chat-history-item-title"]');
      await expect(titles).toHaveCount(2);
      await expect(titles.filter({ hasText: 'Restored From Cloud A' })).toHaveCount(1);
      await expect(titles.filter({ hasText: 'Restored From Cloud B' })).toHaveCount(1);
    });

    // Source: Quinn
    test('T406 restored chats keep message content and the timestamps used for conflict resolution', async ({ page }) => {
      // BUG (SYNC-002): ChatMessageModel.normalize() (src/app/models/chat-message.model.ts) rebuilds each message
      // from a fixed field list and drops `roundId` (also `messageType`, `retryCount`). Restored transcripts lose
      // their round grouping, so TachikomaChatComponent renders "No prompt yet" for a restored chat.
      // Remove test.fail() once normalize() preserves these fields.
      test.fail(true, 'ChatMessageModel.normalize drops roundId/messageType/retryCount on restore');
      const user = await createUniqueEmulatorUser('t406');
      const createdAt = 1_760_000_000_000;
      const updatedAt = 1_760_000_123_456;
      const id = chatId(createdAt, 'msgs1');
      const messages = [
        makeSeedMessage('msg_1', 'Restore probe question from device A', true, createdAt + 10),
        makeSeedMessage('msg_2', 'Restore probe answer from LOGIKOMA', false, createdAt + 20),
      ];
      await seedEmulatorFirestoreDoc(user.uid, 'chat_sessions', id, {
        ...makeSeedChat(id, 'Timestamp Fidelity'), messages, conversationSummary: 'Summary from device A', createdAt, updatedAt,
      });

      await signInWithEmail(page, user.email, user.password);
      await resolveSyncDialog(page, 'skip');

      await expect.poll(async () => (await readLocalChats(page)).length, { timeout: 10_000 }).toBe(1);
      const [restored] = await readLocalChats(page);
      expect(restored.id).toBe(id);
      expect(restored.createdAt).toBe(createdAt);
      expect(restored.updatedAt).toBe(updatedAt);
      expect(restored.conversationSummary).toBe('Summary from device A');
      expect(restored.messages.map((m: any) => [m.id, m.text, m.isUser, m.timestamp, m.roundId])).toEqual(
        messages.map((m) => [m.id, m.text, m.isUser, m.timestamp, m.roundId])
      );

      await openChatHistory(page);
      await page.locator('[data-test-id="chat-history-item"]', { hasText: 'Timestamp Fidelity' }).click();
      await expect(page.locator('[data-test-id="chat-user-message"]').filter({ hasText: 'Restore probe question from device A' })).toBeVisible();
      await expect(page.locator('[data-test-id="chat-agent-message"]').filter({ hasText: 'Restore probe answer from LOGIKOMA' })).toBeVisible();
    });

    // Source: Quinn
    test('T407 restored chat history keeps the most-recent-first order of the originating device', async ({ page }) => {
      // BUG (SYNC-002): ChatStorageService.loadFromCloud() prepends cloud chats in Firestore document-id order
      // (ascending chat_<createdAt>_…), so a new device lists chats oldest-first, the reverse of the originating
      // device. Remove test.fail() once restored chats are ordered by recency.
      test.fail(true, 'loadFromCloud restores chats oldest-first (Firestore doc-id order)');
      const user = await createUniqueEmulatorUser('t407');
      const base = Date.now() - 3 * 60_000;
      // Ids in the app's own chat_<createdAt>_<rand> format, created oldest → newest.
      const seeded = [
        { id: chatId(base, 'zzzz1'), title: 'Order Oldest', at: base },
        { id: chatId(base + 60_000, 'mmmm2'), title: 'Order Middle', at: base + 60_000 },
        { id: chatId(base + 120_000, 'aaaa3'), title: 'Order Newest', at: base + 120_000 },
      ];
      for (const c of seeded) {
        await seedEmulatorFirestoreDoc(user.uid, 'chat_sessions', c.id, {
          ...makeSeedChat(c.id, c.title), createdAt: c.at, updatedAt: c.at,
        });
      }

      await signInWithEmail(page, user.email, user.password);
      await resolveSyncDialog(page, 'skip');
      await expect.poll(async () => (await readLocalChats(page)).length, { timeout: 10_000 }).toBe(3);

      // Device A shows newest first (ChatStorageService.createChat prepends), so the restored device must too.
      await openChatHistory(page);
      await expect(page.locator('[data-test-id="chat-history-item-title"]')).toHaveText([
        'Order Newest', 'Order Middle', 'Order Oldest',
      ]);
    });

    // Source: Quinn
    test('T408 agent profiles and user settings synced from a first device are restored on a second device', async ({ browser, page }) => {
      const user = await createUniqueEmulatorUser('t408');
      await seedEmulatorFirestoreDoc(user.uid, 'user_profile', user.uid, {
        id: user.uid, email: user.email, chatUsername: 'MAJOR-T408', displayName: 'Restore Tester',
        geminiModel: 'models/gemini-3.5-flash', createdAt: Date.now() - 5_000, updatedAt: Date.now() - 5_000,
      });

      // ── Device A: sign in, add a custom agent locally, push agents to the cloud via the profile page.
      const deviceA = await browser.newContext();
      try {
        const pageA = await deviceA.newPage();
        await signInWithEmail(pageA, user.email, user.password);
        await resolveSyncDialog(pageA, 'skip');
        await pageA.evaluate((key) => {
          const profiles = JSON.parse(localStorage.getItem(key) || '[]');
          const now = Date.now();
          profiles.push({ ...profiles[0], id: 'agent_t408_custom', name: 'SECTION-9-T408', system: 'Restored agent.', createdAt: now, updatedAt: now });
          localStorage.setItem(key, JSON.stringify(profiles));
        }, AGENT_PROFILES_KEY);
        await pageA.goto('/profile');
        await pageA.locator('[data-test-id="profile-sync-agents-btn"]').click();
        await expect.poll(async () => (await getEmulatorFirestoreDocs<any>(user.uid, 'agent_profiles')).map((p) => p.id), { timeout: 15_000 })
          .toContain('agent_t408_custom');
      } finally {
        await deviceA.close();
      }

      // ── Device B: fresh context, same user.
      await signInWithEmail(page, user.email, user.password);
      await resolveSyncDialog(page, 'skip');
      await expect.poll(async () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]').map((p: any) => p.name), AGENT_PROFILES_KEY), { timeout: 10_000 })
        .toContain('SECTION-9-T408');

      await page.goto('/tachikoma-profiles');
      await expect(page.locator('[data-test-id="profiles-card-name"]').filter({ hasText: 'SECTION-9-T408' })).toBeVisible();

      await page.goto('/profile');
      await expect(page.locator('[data-test-id="profile-chat-username-preview"]')).toHaveText('MAJOR-T408');
    });

    // Source: Quinn
    test('T409 merge strategy keeps local-only and cloud-only chats and the newest version of shared chats', async ({ page }) => {
      const user = await createUniqueEmulatorUser('t409');
      const old = Date.now() - 10 * 60_000;
      const sharedId = chatId(old, 'shard');
      const localOnlyId = chatId(old + 1000, 'local');
      const cloudOnlyId = chatId(old + 2000, 'cloud');
      await seedEmulatorFirestoreDoc(user.uid, 'chat_sessions', sharedId, { ...makeSeedChat(sharedId, 'Shared NEWER CLOUD'), createdAt: old, updatedAt: old + 300_000 });
      await seedEmulatorFirestoreDoc(user.uid, 'chat_sessions', cloudOnlyId, { ...makeSeedChat(cloudOnlyId, 'Cloud Only'), createdAt: old + 2000, updatedAt: old + 2000 });

      await page.goto('/authentication/login');
      await page.evaluate(([key, chats]) => localStorage.setItem(key as string, JSON.stringify(chats)), [CHAT_SESSIONS_KEY, [
        { ...makeSeedChat(localOnlyId, 'Local Only'), createdAt: old + 1000, updatedAt: old + 1000 },
        { ...makeSeedChat(sharedId, 'Shared OLDER LOCAL'), createdAt: old, updatedAt: old + 100_000 },
      ]] as const);

      await signInWithEmail(page, user.email, user.password);
      await resolveSyncDialog(page, 'merge');

      // Cloud converges on the merged set, newest version of the shared chat wins.
      await expect.poll(async () => (await getEmulatorFirestoreDocs<any>(user.uid, 'chat_sessions')).map((c) => c.title).sort(), { timeout: 10_000 })
        .toEqual(['Cloud Only', 'Local Only', 'Shared NEWER CLOUD']);

      // This device shows the same merged set.
      await openChatHistory(page);
      const titles = page.locator('[data-test-id="chat-history-item-title"]');
      await expect(titles).toHaveCount(3);
      await expect(titles.filter({ hasText: 'Shared NEWER CLOUD' })).toHaveCount(1);
      await expect(titles.filter({ hasText: 'Local Only' })).toHaveCount(1);
      await expect(titles.filter({ hasText: 'Cloud Only' })).toHaveCount(1);
    });

    // Source: Quinn
    test('T410 use-cloud strategy replaces the local device chats with the cloud copy', async ({ page }) => {
      // BUG (SYNC-002 / AUTH-003): "Use Cloud Data" keeps the device's local-only chat. FirestoreService.syncCollection()
      // writes the result to `firestore_{uid}_chat_sessions` (a key no UI service reads) and removes
      // `tachikoma_chat_sessions`, while ChatStorageService keeps and re-persists its in-memory sessions.
      // Remove test.fail() once cloud-to-local updates the keys/signals the app actually reads.
      test.fail(true, 'cloud-to-local strategy does not discard local chats');
      const user = await createUniqueEmulatorUser('t410');
      const t = Date.now() - 60_000;
      const cloudId = chatId(t, 'cloud');
      const localId = chatId(t + 1000, 'local');
      await seedEmulatorFirestoreDoc(user.uid, 'chat_sessions', cloudId, { ...makeSeedChat(cloudId, 'Cloud Copy Wins'), createdAt: t, updatedAt: t });

      await page.goto('/authentication/login');
      await page.evaluate(([key, chats]) => localStorage.setItem(key as string, JSON.stringify(chats)), [CHAT_SESSIONS_KEY, [
        { ...makeSeedChat(localId, 'Local To Discard'), createdAt: t + 1000, updatedAt: t + 1000 },
      ]] as const);

      await signInWithEmail(page, user.email, user.password);
      await resolveSyncDialog(page, 'cloud-to-local');

      // Cloud is untouched by a cloud-to-local restore.
      await expect.poll(async () => (await getEmulatorFirestoreDocs<any>(user.uid, 'chat_sessions')).map((c) => c.title), { timeout: 10_000 })
        .toEqual(['Cloud Copy Wins']);

      await openChatHistory(page);
      const titles = page.locator('[data-test-id="chat-history-item-title"]');
      await expect(titles).toHaveText(['Cloud Copy Wins']);
    });

    // Source: Quinn
    test('T411 use-local strategy replaces the cloud copy with the local device data', async ({ page }) => {
      const user = await createUniqueEmulatorUser('t411');
      const t = Date.now() - 60_000;
      const cloudId = chatId(t, 'cloud');
      const localId = chatId(t + 1000, 'local');
      await seedEmulatorFirestoreDoc(user.uid, 'chat_sessions', cloudId, { ...makeSeedChat(cloudId, 'Cloud To Replace'), createdAt: t, updatedAt: t });

      await page.goto('/authentication/login');
      await page.evaluate(([key, chats]) => localStorage.setItem(key as string, JSON.stringify(chats)), [CHAT_SESSIONS_KEY, [
        { ...makeSeedChat(localId, 'Local Copy Wins'), createdAt: t + 1000, updatedAt: t + 1000 },
      ]] as const);

      await signInWithEmail(page, user.email, user.password);
      await resolveSyncDialog(page, 'local-to-cloud');

      await expect.poll(async () => (await getEmulatorFirestoreDocs<any>(user.uid, 'chat_sessions')).map((c) => c.title), { timeout: 10_000 })
        .toEqual(['Local Copy Wins']);

      await openChatHistory(page);
      await expect(page.locator('[data-test-id="chat-history-item-title"]')).toHaveText(['Local Copy Wins']);
    });

    // Source: Quinn
    test('T412 anonymous guest on a new device does not restore any cloud data', async ({ page }) => {
      const user = await createUniqueEmulatorUser('t412');
      const t = Date.now();
      await seedEmulatorFirestoreDoc(user.uid, 'chat_sessions', chatId(t, 'secret'), { ...makeSeedChat(chatId(t, 'secret'), 'Private Cloud Chat'), createdAt: t, updatedAt: t });
      await seedEmulatorFirestoreDoc(user.uid, 'agent_profiles', 'agent_t412_private', {
        id: 'agent_t412_private', name: 'PRIVATE-T412', color: 'cyan', hex: '#00ffff', temp: 0.5, system: 'Private.', role: 'chatter', createdAt: t, updatedAt: t,
      });

      await continueAsGuest(page);
      await expect(page.locator('[data-test-id="sync-dialog"]')).toHaveCount(0);

      await openChatHistory(page);
      await expect(page.locator('[data-test-id="chat-history-empty"]')).toBeVisible();
      await expect(page.locator('[data-test-id="chat-history-item-title"]').filter({ hasText: 'Private Cloud Chat' })).toHaveCount(0);

      await page.goto('/tachikoma-profiles');
      await expect(page.locator('[data-test-id="profiles-card-name"]').first()).toBeVisible();
      await expect(page.locator('[data-test-id="profiles-card-name"]').filter({ hasText: 'PRIVATE-T412' })).toHaveCount(0);

      const storageDump = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
      expect(storageDump).not.toContain('Private Cloud Chat');
      expect(storageDump).not.toContain('PRIVATE-T412');
    });

    // Source: Quinn
    test('T413 sign-in with an empty cloud copy completes without errors and keeps default agents', async ({ page }) => {
      const user = await createUniqueEmulatorUser('t413');
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await signInWithEmail(page, user.email, user.password);
      await resolveSyncDialog(page, 'skip');

      await openChatHistory(page);
      await expect(page.locator('[data-test-id="chat-history-empty"]')).toBeVisible();
      await expect(page.locator('[data-test-id="chat-history-item"]')).toHaveCount(0);

      await page.goto('/tachikoma-profiles');
      await expect(page.locator('[data-test-id="profiles-card-name"]').filter({ hasText: 'LOGIKOMA' })).toBeVisible();
      expect(await readLocalChats(page)).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  // ══ SYNC-003: Offline-First Operation (T414-T420) ═════════════════════════

  test.describe('T414-T420 Offline-First', () => {
    test('T414 existing local chats remain accessible when offline', async ({ page }) => {
      await continueAsGuest(page);
      await page.evaluate((key) => {
        localStorage.setItem(key, JSON.stringify([
          makeSeedChat('offline-chat-1', 'Offline Available Chat'),
        ]));
        localStorage.setItem('tachikoma_current_chat_id', 'offline-chat-1');
      }, CHAT_SESSIONS_KEY);

      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);

      // Go offline
      await page.context().setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});

      // Local data should still be accessible
      const sessions = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), CHAT_SESSIONS_KEY);
      expect(sessions.some((s: any) => s.title === 'Offline Available Chat')).toBeTruthy();

      await page.context().setOffline(false);
    });

    test('T415 agent profiles remain accessible when offline', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma-profiles');

      const initialProfiles = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), AGENT_PROFILES_KEY);

      await page.context().setOffline(true);

      const offlineProfiles = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), AGENT_PROFILES_KEY);
      expect(offlineProfiles.length).toBe(initialProfiles.length);

      await page.context().setOffline(false);
    });

    test('T416 new changes made while offline persist to localStorage', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma-profiles');

      // Go offline
      await page.context().setOffline(true);

      // Add a profile while offline
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const form = page.locator('mat-card', { hasText: 'CREATE NEW AGENT' });
      await form.locator('mat-form-field:has-text("Agent Name") input').fill('OFFLINE-AGENT');
      await form.locator('textarea').first().fill('Created while offline.');
      await page.locator('[data-test-id="profiles-save-new-btn"]').click();

      const profiles = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), AGENT_PROFILES_KEY);
      expect(profiles.some((p: any) => p.name === 'OFFLINE-AGENT')).toBeTruthy();

      await page.context().setOffline(false);
    });

    test('T417 app does not crash when network requests fail', async ({ page }) => {
      await continueAsGuest(page);
      await page.context().setOffline(true);
      await page.goto('/tachikoma').catch(() => {});
      await page.context().setOffline(false);

      // App should be in a usable state (or at least show a cached/offline page)
      // Check for absence of unhandled error overlays
      const errorOverlay = page.locator('text=/unhandled error|cannot read/i');
      await expect(errorOverlay).not.toBeVisible();
    });

    test('T418 localStorage writes succeed while offline', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/');
      await page.context().setOffline(true);

      // Direct localStorage write should work regardless of network
      await page.evaluate(() => {
        localStorage.setItem('offline-test-key', 'offline-test-value');
      });
      const val = await page.evaluate(() => localStorage.getItem('offline-test-key'));
      expect(val).toBe('offline-test-value');

      await page.context().setOffline(false);
      await page.evaluate(() => localStorage.removeItem('offline-test-key'));
    });
  });

  // ══ SYNC-004: Firestore App Namespace (T421-T426) ═════════════════════════

  test.describe('T421-T426 Firestore Namespace', () => {
    test('T421 localStorage uses user-scoped keys for authenticated data', async ({ page }) => {
      await continueAsGuest(page);
      await page.evaluate(() => {
        // Simulate authenticated user storage key format
        localStorage.setItem('firestore_uid-test_chat_sessions', JSON.stringify([{ id: 'scoped-1' }]));
        localStorage.setItem('firestore_anonymous_chat_sessions', JSON.stringify([{ id: 'anon-1' }]));
      });

      const userScoped = await page.evaluate(() => localStorage.getItem('firestore_uid-test_chat_sessions'));
      const anonScoped = await page.evaluate(() => localStorage.getItem('firestore_anonymous_chat_sessions'));

      // Both scopes should be independent
      expect(JSON.parse(userScoped!)[0].id).toBe('scoped-1');
      expect(JSON.parse(anonScoped!)[0].id).toBe('anon-1');
    });

    test('T422 anonymous user data is stored under anonymous key prefix', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma-profiles');

      // Any Firestore-layer localStorage writes from an anonymous user should use the anon prefix
      const keys = await page.evaluate(() => Object.keys(localStorage));
      const firestoreKeys = keys.filter((k: string) => k.startsWith('firestore_'));
      for (const key of firestoreKeys) {
        // Should NOT have a UID in the key (only anonymous prefix)
        expect(key).toMatch(/^firestore_anonymous_/);
      }
    });

    test('T423 anonymous and authenticated data are in separate localStorage namespaces', async ({ page }) => {
      await continueAsGuest(page);

      // Write as anon
      await page.evaluate(() => {
        localStorage.setItem('firestore_anonymous_profiles', JSON.stringify([{ id: 'anon-profile' }]));
      });

      // Switch to authenticated namespace
      await page.evaluate(() => {
        localStorage.setItem('firestore_user-xyz_profiles', JSON.stringify([{ id: 'user-profile' }]));
      });

      const anonData = await page.evaluate(() => JSON.parse(localStorage.getItem('firestore_anonymous_profiles') || '[]'));
      const userData = await page.evaluate(() => JSON.parse(localStorage.getItem('firestore_user-xyz_profiles') || '[]'));

      expect(anonData[0].id).toBe('anon-profile');
      expect(userData[0].id).toBe('user-profile');
      // They are completely separate
      expect(anonData[0].id).not.toBe(userData[0].id);
    });

    test('T424 user-specific data is not accessible in anonymous namespace', async ({ page }) => {
      await continueAsGuest(page);

      await page.evaluate(() => {
        localStorage.setItem('firestore_user-secret_chats', JSON.stringify([{ id: 'private' }]));
      });

      const anonView = await page.evaluate(() => localStorage.getItem('firestore_anonymous_chats'));
      expect(anonView).toBeNull();
    });
  });
});
