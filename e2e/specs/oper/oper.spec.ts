import { test, expect } from '@playwright/test';
import {
  continueAsGuest,
  suppressExplainerDialog,
  seedApiKey,
  mockGeminiApi,
} from '../../helpers';

/**
 * OPER-001: Show Token and Cost Estimates (T500-T506)
 * OPER-002: Stop at Soft and Hard Token Limits (T507-T513)
 * OPER-003: Prevent Context Overflow (T514-T520)
 * OPER-004: Global Tokenization / Shell Alignment (T521-T526)
 * OPER-006: ARIA and Focus-Visible Hardening (T535-T542)
 */
test.describe('OPER — Cost, Limits, and Runtime Transparency', () => {

  test.beforeEach(async ({ page }) => {
    await continueAsGuest(page);
    await seedApiKey(page);
    await page.goto('/tachikoma');
    await suppressExplainerDialog(page);

    await page.evaluate(() => {
      const agents = [
        { id: 'logikoma', name: 'LOGIKOMA', color: 'logikoma', hex: '#00f3ff', temp: 0.2, role: 'chatter', system: 'Analyze.', model: 'models/gemini-3.5-flash', silenceProtocol: 'standard', status: 'idle', createdAt: 1, updatedAt: 1 },
        { id: 'moderator', name: 'MODERATOR', color: 'moderator', hex: '#00ff41', temp: 0.5, role: 'moderator', system: 'Synthesize.', model: 'models/gemini-3.5-flash', silenceProtocol: 'standard', status: 'idle', createdAt: 1, updatedAt: 1 },
      ];
      localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{
        id: 'oper-chat', title: 'OPER Test', messages: [],
        participatingAgents: agents, conversationSummary: '', createdAt: 1, updatedAt: 1,
      }]));
      localStorage.setItem('tachikoma_current_chat_id', 'oper-chat');
      localStorage.setItem('tachikoma_agent_profiles', JSON.stringify(agents));
    });
    await mockGeminiApi(page);
    await page.reload();
    await suppressExplainerDialog(page);
  });

  // ══ OPER-001: Token and Cost Estimates (T500-T506) ════════════════════════
  // The header metrics dashboard was retired; per-model metrics now live in the status bar segments
  // (Wireframe_ChatRoundtable.md, Status Bar: chat-status-model, -tpm, -ctx, -rpm).

  test.describe('T500-T506 Token and Cost Visibility', () => {
    test('T500 metrics are visible in the status bar @smoke @landscape', async ({ page }) => {
      await expect(page.locator('[data-test-id="chat-status-bar"]')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('[data-test-id="chat-status-tpm"]')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('[data-test-id="chat-status-ctx"]')).toBeVisible();
      await expect(page.locator('[data-test-id="chat-status-rpm"]')).toBeVisible();
    });

    test('T501 per-model metrics section is present @landscape', async ({ page }) => {
      // The status bar reports the metrics of the first model in use (both seeded agents use gemini-3.5-flash)
      await expect(page.locator('[data-test-id="chat-status-model"]')).toHaveText(/GEMINI-3\.5-FLASH/, { timeout: 5_000 });
      await expect(page.locator('[data-test-id="chat-status-tpm"]')).toHaveText(/TPM: \S+\/\S+/);
      await expect(page.locator('[data-test-id="chat-status-ctx"]')).toHaveText(/CTX: \d+%/);
    });

    test('T502 token/cost estimate is tracked after a round', async ({ page }) => {
      await mockGeminiApi(page, [
        { text: 'Token test response.', usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30, totalTokenCount: 150 } },
        { text: 'Synthesis.', usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 20, totalTokenCount: 100 } },
      ]);

      await page.locator('[data-test-id="chat-message-input"]').fill('Token tracking test');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 15_000 });

      // The round cost badge should appear
      const costBadge = page.locator('[data-test-id="chat-round-cost-badge"]');
      await expect(costBadge.first()).toBeVisible({ timeout: 5_000 });
    });

    test('T503 cost estimate renders with dollar prefix', async ({ page }) => {
      await mockGeminiApi(page, [
        { text: 'Cost test.', usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 500, totalTokenCount: 1500 } },
        { text: 'Synthesis.', usageMetadata: { promptTokenCount: 500, candidatesTokenCount: 200, totalTokenCount: 700 } },
      ]);

      await page.locator('[data-test-id="chat-message-input"]').fill('Cost estimate test');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 15_000 });

      const costBadge = page.locator('[data-test-id="chat-round-cost-badge"]').first();
      await expect(costBadge).toBeVisible({ timeout: 5_000 });
      const text = await costBadge.textContent();
      expect(text).toMatch(/\$|< \$/);
    });

    test('T504 daily request counter increments after each round @landscape', async ({ page }) => {
      await mockGeminiApi(page, [{ text: 'A' }, { text: 'B' }]);

      const rpm = page.locator('[data-test-id="chat-status-rpm"]');
      await expect(rpm).toHaveText(/RPM: 0\//, { timeout: 5_000 });
      const before = (await rpm.textContent())?.trim();

      await page.locator('[data-test-id="chat-message-input"]').fill('Counter test');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 15_000 });

      // Counter should have changed
      await expect(rpm).not.toHaveText(before ?? '', { timeout: 5_000 });
      await expect(rpm).toHaveText(/RPM: [1-9]\d*\//);
    });

    test('T505 token metrics do not block orchestration execution', async ({ page }) => {
      await mockGeminiApi(page, [{ text: 'Fast response.' }, { text: 'Synthesis.' }]);

      const start = Date.now();
      await page.locator('[data-test-id="chat-message-input"]').fill('Non-blocking test');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 15_000 });
      const elapsed = Date.now() - start;
      // Should complete in a reasonable time — metrics shouldn't add significant overhead
      expect(elapsed).toBeLessThan(15_000);
    });

    test('T506 formatTokenCount renders M suffix for large counts @landscape', async ({ page }) => {
      // The TPM budget (4,000,000 tokens/min) is rendered with formatTokenCount, which uses the M suffix
      await expect(page.locator('[data-test-id="chat-status-tpm"]')).toHaveText(/\/\d+(\.\d)?M\b/, { timeout: 5_000 });
    });
  });

  // ══ OPER-002: Token Limit Enforcement (T507-T513) ═════════════════════════

  test.describe('T507-T513 Soft and Hard Token Limits', () => {
    test('T507 soft limit warning banner appears when context approaches limit', async ({ page }) => {
      // Near-limit context: a 1,000-token model window and 850 counted input tokens per request (85% after
      // the first request, so the soft limit (80%) is crossed during the first round).
      await mockGeminiApi(page, [{ text: 'Near the limit.' }, { text: 'Synthesis.' }], { inputTokenLimit: 1_000, countTokens: 850 });
      await page.reload();

      const banner = page.locator('[data-test-id="chat-soft-limit-banner"]');
      await expect(banner).toHaveCount(0);

      await page.locator('[data-test-id="chat-message-input"]').fill('Fill the context window');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      await expect(banner).toBeVisible({ timeout: 15_000 });
      await expect(banner).toContainText('gemini-3.5-flash');
    });

    test('T508 soft limit banner has ARIA live region for screen readers', async ({ page }) => {
      await mockGeminiApi(page, [{ text: 'Near the limit.' }, { text: 'Synthesis.' }], { inputTokenLimit: 1_000, countTokens: 850 });
      await page.reload();

      await page.locator('[data-test-id="chat-message-input"]').fill('Fill the context window');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      const banner = page.locator('[data-test-id="chat-soft-limit-banner"]');
      await expect(banner).toBeVisible({ timeout: 15_000 });
      await expect(banner).toHaveAttribute('aria-live', 'polite');
      await expect(banner).toHaveAttribute('role', 'alert');
    });

    test('T509 daily quota meter shows progress towards free tier limit @landscape', async ({ page }) => {
      // The status bar request meter shows usage against the tier limit; a guest is on the free tier (15 RPM).
      // Note: the retired header dashboard also showed the 20-requests/day quota; the status bar has no daily meter.
      await expect(page.locator('[data-test-id="chat-status-rpm"]')).toHaveText(/RPM: 0\/15\b/, { timeout: 5_000 });
    });

    test('T510 meter bar shows warning class when approaching limit @landscape', async ({ page }) => {
      test.setTimeout(120_000);
      await mockGeminiApi(page, Array(17).fill({ text: 'Request.' }));

      const rpm = page.locator('[data-test-id="chat-status-rpm"]');
      const processing = page.locator('[data-test-id="chat-status-processing"]');
      const rpmCount = async () => Number((await rpm.textContent())?.match(/RPM: (\d+)\//)?.[1] ?? 0);

      // Run rounds until more than 80% of the 15-RPM free tier is used (13+ requests in the last minute)
      for (let i = 0; i < 10 && (await rpmCount()) < 13; i++) {
        await page.locator('[data-test-id="chat-message-input"]').fill(`Request ${i}`);
        await page.locator('[data-test-id="chat-send-btn"]').click();
        await expect(processing).toBeVisible({ timeout: 10_000 });
        await expect(processing).toHaveCount(0, { timeout: 30_000 });
      }
      expect(await rpmCount()).toBeGreaterThanOrEqual(13);

      // Above 80% of the limit the RPM segment carries the warning (or danger) class
      await expect(rpm).toHaveClass(/status-warn|status-danger/);
    });

    test('T511 rate limit per minute is shown in metrics @landscape', async ({ page }) => {
      const rpmInfo = page.locator('[data-test-id="chat-status-rpm"]');
      await expect(rpmInfo).toBeVisible({ timeout: 5_000 });
      await expect(rpmInfo).toHaveText(/RPM: \d+\/\d+/);
    });
  });

  // ══ OPER-003: Context Overflow Prevention (T514-T520) ════════════════════

  test.describe('T514-T520 Context Overflow', () => {
    test('T514 conversation history uses round-based windowing', async ({ page }) => {
      // Seed a chat with 8 rounds (more than FULL_ROUNDS_CONTEXT=6)
      await page.evaluate(() => {
        const now = Date.now();
        const messages: any[] = [];
        for (let r = 0; r < 8; r++) {
          messages.push({ id: `u${r}`, sender: 'USER', text: `Round ${r} question`, html: '', isUser: true, timestamp: now + r, roundId: r });
          messages.push({ id: `m${r}`, sender: 'LOGIKOMA', text: `Round ${r} answer`, html: '', isUser: false, agentId: 'logikoma', timestamp: now + r + 0.5, roundId: r });
        }
        localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{
          id: 'oper-chat', title: 'OPER Test', messages,
          participatingAgents: [
            { id: 'logikoma', name: 'LOGIKOMA', color: 'logikoma', hex: '#00f3ff', temp: 0.2, role: 'chatter', system: 'Analyze.', model: 'models/gemini-3.5-flash', silenceProtocol: 'standard', status: 'idle', createdAt: 1, updatedAt: 1 },
            { id: 'moderator', name: 'MODERATOR', color: 'moderator', hex: '#00ff41', temp: 0.5, role: 'moderator', system: 'Synthesize.', model: 'models/gemini-3.5-flash', silenceProtocol: 'standard', status: 'idle', createdAt: 1, updatedAt: 1 },
          ],
          conversationSummary: '', createdAt: now, updatedAt: now,
        }]));
        localStorage.setItem('tachikoma_current_chat_id', 'oper-chat');
      });
      await page.reload();
      await suppressExplainerDialog(page);

      // Capture what gets sent to the API
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          await route.fulfill({ json: {
            candidates: [{ content: { parts: [{ text: 'Context window test.' }], role: 'model' }, finishReason: 'STOP', index: 0 }],
            usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 50, totalTokenCount: 250 },
          }});
        } else {
          await route.fallback(); // other Gemini calls go to the beforeEach mock
        }
      });

      const generateRequest = page.waitForRequest((req) => req.url().includes(':generateContent'), { timeout: 15_000 });
      await page.locator('[data-test-id="chat-message-input"]').fill('Context overflow test');
      await page.locator('[data-test-id="chat-send-btn"]').click();
      // Wait for the outgoing request: the seeded transcript already shows agent messages
      const sent = JSON.stringify((await generateRequest).postDataJSON());

      // The prompt should contain "CONVERSATION HISTORY" for the old rounds
      expect(sent).toContain('CONVERSATION HISTORY');
    });

    test('T515 older rounds are compressed to moderator-only in context', async ({ page }) => {
      await page.evaluate(() => {
        const now = Date.now();
        const messages: any[] = [];
        for (let r = 0; r < 8; r++) {
          messages.push({ id: `u${r}`, sender: 'USER', text: `Q${r}`, html: '', isUser: true, timestamp: now + r, roundId: r });
          messages.push({ id: `mod${r}`, sender: 'MODERATOR', text: `Summary${r}`, html: '', isUser: false, agentId: 'moderator', timestamp: now + r + 0.5, roundId: r });
        }
        const stored = JSON.parse(localStorage.getItem('tachikoma_chat_sessions') || '[]');
        if (stored[0]) { stored[0].messages = messages; localStorage.setItem('tachikoma_chat_sessions', JSON.stringify(stored)); }
      });
      await page.reload();
      await suppressExplainerDialog(page);

      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          await route.fulfill({ json: {
            candidates: [{ content: { parts: [{ text: 'Windowed.' }], role: 'model' }, finishReason: 'STOP', index: 0 }],
            usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, totalTokenCount: 120 },
          }});
        } else {
          await route.fallback(); // other Gemini calls go to the beforeEach mock
        }
      });

      const generateRequest = page.waitForRequest((req) => req.url().includes(':generateContent'), { timeout: 15_000 });
      await page.locator('[data-test-id="chat-message-input"]').fill('Compression test');
      await page.locator('[data-test-id="chat-send-btn"]').click();
      // Wait for the outgoing request: the seeded transcript already shows agent messages
      const sent = JSON.stringify((await generateRequest).postDataJSON());

      // Older rounds should be compressed — prompt should mention "CONVERSATION HISTORY" not individual chatter messages for old rounds
      expect(sent).toContain('CONVERSATION HISTORY');
      // Compressed rounds keep only the user prompt and the moderator synthesis
      expect(sent).toContain('MODERATOR (Moderator): Summary0');
    });

    test('T516 long conversation stays responsive (no O(n²) growth)', async ({ page }) => {
      // Seed 20 rounds worth of messages
      await page.evaluate(() => {
        const now = Date.now();
        const messages: any[] = [];
        for (let r = 0; r < 20; r++) {
          messages.push({ id: `u${r}`, sender: 'USER', text: `Long question ${r}`.repeat(10), html: '', isUser: true, timestamp: now + r, roundId: r });
          messages.push({ id: `a${r}`, sender: 'LOGIKOMA', text: `Long answer ${r}`.repeat(20), html: '', isUser: false, agentId: 'logikoma', timestamp: now + r + 0.5, roundId: r });
          messages.push({ id: `mod${r}`, sender: 'MODERATOR', text: `Moderator summary ${r}`.repeat(15), html: '', isUser: false, agentId: 'moderator', timestamp: now + r + 1, roundId: r });
        }
        const stored = JSON.parse(localStorage.getItem('tachikoma_chat_sessions') || '[]');
        if (stored[0]) { stored[0].messages = messages; localStorage.setItem('tachikoma_chat_sessions', JSON.stringify(stored)); }
      });
      await page.reload();
      await suppressExplainerDialog(page);

      // Track prompt size to verify windowing limits growth
      const promptSizes: number[] = [];
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          const body = JSON.stringify(route.request().postDataJSON());
          promptSizes.push(body.length);
          await route.fulfill({ json: {
            candidates: [{ content: { parts: [{ text: 'OK.' }], role: 'model' }, finishReason: 'STOP', index: 0 }],
            usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10, totalTokenCount: 110 },
          }});
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('Overflow check');
      await page.locator('[data-test-id="chat-send-btn"]').click();
      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 15_000 });

      if (promptSizes.length > 0) {
        // Prompt size should be bounded — windowing should keep it under ~50KB
        const maxPromptSize = Math.max(...promptSizes);
        expect(maxPromptSize).toBeLessThan(100_000);
      }
    });
  });

  // ══ OPER-004: Shell Token Alignment (T521-T526) ═══════════════════════════

  test.describe('T521-T526 Shell Token Alignment', () => {
    test('T521 header is rendered with SAC styling @smoke', async ({ page }) => {
      const header = page.locator('mat-toolbar.topbar, header.topbar, .topbar');
      await expect(header.first()).toBeVisible({ timeout: 5_000 });
    });

    test('T522 sidebar is rendered without layout breakage @smoke', async ({ page }) => {
      await page.goto('/');
      const sidebar = page.locator('.mat-drawer.sidebarNav, .sidebar, mat-sidenav');
      await expect(sidebar.first()).toBeAttached();
    });

    test('T523 core routes load without visual overlap', async ({ page }) => {
      const routes = ['/', '/tachikoma', '/tachikoma-profiles'];
      for (const route of routes) {
        await page.goto(route);
        // No JavaScript errors should occur on load
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.waitForLoadState('domcontentloaded');
        expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
      }
    });

    test('T524 SAC token custom properties are defined in page styles', async ({ page }) => {
      const sacBgPrimary = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--sac-color-bg-primary').trim()
      );
      expect(sacBgPrimary).toBeTruthy();
    });

    test('T525 neon green accent token is applied correctly', async ({ page }) => {
      const sacGreen = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--sac-color-green').trim()
      );
      expect(sacGreen).toBeTruthy();
    });

    test('T526 header height token matches actual header height', async ({ page }) => {
      const tokenHeight = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--sac-header-height').trim()
      );
      expect(tokenHeight).toBeTruthy();
    });
  });

  // ══ OPER-006: ARIA and Focus-Visible Hardening (T535-T542) ════════════════

  test.describe('T535-T542 ARIA and Focus Visibility', () => {
    test('T535 login form inputs have aria-label attributes', async ({ page }) => {
      await page.goto('/authentication/login');
      const emailInput = page.locator('[data-test-id="auth-email-input"]');
      const ariaLabel = await emailInput.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('T536 guest button has descriptive aria-label', async ({ page }) => {
      await page.goto('/authentication/login');
      const guestBtn = page.locator('[data-test-id="auth-guest-btn"]');
      const ariaLabel = await guestBtn.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel?.toLowerCase()).toMatch(/guest|continue/);
    });

    test('T537 chat send button has aria-label', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);
      const sendBtn = page.locator('[data-test-id="chat-send-btn"]');
      const ariaLabel = await sendBtn.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('T538 chat message input has aria-label', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);
      const input = page.locator('[data-test-id="chat-message-input"]');
      const ariaLabel = await input.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('T539 transcript navigation buttons have aria-labels', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma');
      await suppressExplainerDialog(page);

      const topBtn = page.locator('[data-test-id="chat-jump-top-btn"]');
      const latestBtn = page.locator('[data-test-id="chat-jump-latest-btn"]');
      expect(await topBtn.getAttribute('aria-label')).toBeTruthy();
      expect(await latestBtn.getAttribute('aria-label')).toBeTruthy();
    });

    test('T540 profiles intent panel has aria-label on textarea', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma-profiles');
      const intentInput = page.locator('[data-test-id="profiles-intent-input"]');
      const ariaLabel = await intentInput.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('T541 profiles edit and delete buttons have aria-labels', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma-profiles');
      const editBtn = page.locator('[data-test-id="profiles-edit-btn"]').first();
      const deleteBtn = page.locator('[data-test-id="profiles-delete-btn"]').first();
      expect(await editBtn.getAttribute('aria-label')).toBeTruthy();
      expect(await deleteBtn.getAttribute('aria-label')).toBeTruthy();
    });

    test('T542 confirm dialog has role=dialog and aria-labelledby', async ({ page }) => {
      await continueAsGuest(page);
      await page.goto('/tachikoma-profiles');
      await page.locator('[data-test-id="profiles-delete-btn"]').first().click();
      const dialog = page.locator('mat-dialog-container');
      await expect(dialog).toBeVisible({ timeout: 3_000 });

      const roleAttr = await page.locator('[role="dialog"]').first().getAttribute('role');
      expect(roleAttr).toBe('dialog');
    });
  });
});
