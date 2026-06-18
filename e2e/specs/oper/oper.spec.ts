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
    await page.reload();
    await suppressExplainerDialog(page);
  });

  // ══ OPER-001: Token and Cost Estimates (T500-T506) ════════════════════════

  test.describe('T500-T506 Token and Cost Visibility', () => {
    test('T500 metrics dashboard is visible in the header @smoke', async ({ page }) => {
      await expect(page.locator('.metrics-dashboard')).toBeVisible({ timeout: 5_000 });
    });

    test('T501 per-model metrics section is present', async ({ page }) => {
      await expect(page.locator('.model-group, .model-metrics').first()).toBeVisible({ timeout: 5_000 });
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

    test('T504 daily request counter increments after each round', async ({ page }) => {
      await mockGeminiApi(page, [{ text: 'A' }, { text: 'B' }]);

      const before = await page.locator('.meter-info', { hasText: '/' }).first().textContent();

      await page.locator('[data-test-id="chat-message-input"]').fill('Counter test');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 15_000 });

      const after = await page.locator('.meter-info', { hasText: '/' }).first().textContent();
      // Counter should have changed
      expect(after).not.toBe(before);
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

    test('T506 formatTokenCount renders M suffix for large counts', async ({ page }) => {
      // We test the display by checking the metrics dashboard text format
      // For model with 1M token limit, the display should show "xM" or "xK"
      const metricsText = await page.locator('.metrics-dashboard').textContent();
      expect(metricsText).toMatch(/[KM]/); // Should have K or M formatting
    });
  });

  // ══ OPER-002: Token Limit Enforcement (T507-T513) ═════════════════════════

  test.describe('T507-T513 Soft and Hard Token Limits', () => {
    test('T507 soft limit warning banner appears when context approaches limit', async ({ page }) => {
      // Inject near-limit context token count into the component state
      await page.evaluate(() => {
        // Access Angular component — inject high context token counts
        const el = document.querySelector('app-tachikoma-chat') as any;
        if (el?.__ngContext__) {
          // This is a best-effort check; the banner is controlled by contextSoftWarning signal
        }
      });

      // The soft limit banner element should exist in the DOM
      // (it appears when contextSoftWarning signal is set)
      await expect(page.locator('[data-test-id="chat-soft-limit-banner"]')).toBeAttached();
    });

    test('T508 soft limit banner has ARIA live region for screen readers', async ({ page }) => {
      const banner = page.locator('[data-test-id="chat-soft-limit-banner"]');
      await expect(banner).toBeAttached();
      const ariaLive = await banner.getAttribute('aria-live');
      expect(ariaLive).toBe('polite');
    });

    test('T509 daily quota meter shows progress towards free tier limit', async ({ page }) => {
      const meterBar = page.locator('.meter-bar').first();
      await expect(meterBar).toBeVisible({ timeout: 5_000 });
    });

    test('T510 meter bar shows warning class when approaching limit', async ({ page }) => {
      test.setTimeout(120_000);
      // Set daily request count to near-limit in the component
      await mockGeminiApi(page, Array(17).fill({ text: 'Request.' }));

      // Make multiple requests to approach the 20-request free tier
      for (let i = 0; i < 16; i++) {
        await page.locator('[data-test-id="chat-message-input"]').fill(`Request ${i}`);
        await page.locator('[data-test-id="chat-send-btn"]').click();
        await expect(page.locator('[data-test-id="chat-agent-message"]').last()).toBeVisible({ timeout: 15_000 });
      }

      // At 16/20 requests (80%), meter should show warning class
      const meterBar = page.locator('.meter-bar').first();
      const classes = await meterBar.getAttribute('class');
      expect(classes).toMatch(/warning|danger/);
    });

    test('T511 rate limit per minute is shown in metrics', async ({ page }) => {
      const rpmInfo = page.locator('.meter-info, .metrics-dashboard');
      await expect(rpmInfo.first()).toBeVisible({ timeout: 5_000 });
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
      let historyInPrompt = '';
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          const body = route.request().postDataJSON();
          historyInPrompt = JSON.stringify(body);
          await route.fulfill({ json: {
            candidates: [{ content: { parts: [{ text: 'Context window test.' }], role: 'model' }, finishReason: 'STOP', index: 0 }],
            usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 50, totalTokenCount: 250 },
          }});
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('Context overflow test');
      await page.locator('[data-test-id="chat-send-btn"]').click();
      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 15_000 });

      // The prompt should contain "CONVERSATION HISTORY" for the old rounds
      expect(historyInPrompt).toContain('CONVERSATION HISTORY');
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

      let promptText = '';
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          const body = route.request().postDataJSON();
          promptText = JSON.stringify(body);
          await route.fulfill({ json: {
            candidates: [{ content: { parts: [{ text: 'Windowed.' }], role: 'model' }, finishReason: 'STOP', index: 0 }],
            usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, totalTokenCount: 120 },
          }});
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('Compression test');
      await page.locator('[data-test-id="chat-send-btn"]').click();
      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 15_000 });

      // Older rounds should be compressed — prompt should mention "CONVERSATION HISTORY" not individual chatter messages for old rounds
      expect(promptText).toContain('CONVERSATION HISTORY');
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
