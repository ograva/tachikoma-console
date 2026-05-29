import { Page, Route } from '@playwright/test';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/**';

export interface MockResponse {
  text?: string;
  finishReason?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/** Build a Gemini generateContent response body from a canned text reply. */
function buildGenerateResponse(reply: MockResponse): object {
  return {
    candidates: [
      {
        content: { parts: [{ text: reply.text ?? 'Mock response.' }], role: 'model' },
        finishReason: reply.finishReason ?? 'STOP',
        index: 0,
      },
    ],
    usageMetadata: {
      promptTokenCount: reply.usageMetadata?.promptTokenCount ?? 100,
      candidatesTokenCount: reply.usageMetadata?.candidatesTokenCount ?? 50,
      totalTokenCount: reply.usageMetadata?.totalTokenCount ?? 150,
    },
    modelVersion: 'gemini-mock',
  };
}

/** Build a Gemini countTokens response body. */
function buildCountTokensResponse(tokenCount = 100): object {
  return { totalTokens: tokenCount };
}

/** Build a Gemini models list response. */
function buildModelsListResponse(): object {
  return {
    models: [
      { name: 'models/gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash Exp', inputTokenLimit: 1048576, outputTokenLimit: 8192 },
      { name: 'models/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', inputTokenLimit: 1048576, outputTokenLimit: 8192 },
    ],
  };
}

/** Build a Gemini model detail response. */
function buildModelDetailResponse(): object {
  return { name: 'models/gemini-2.0-flash-exp', inputTokenLimit: 1048576, outputTokenLimit: 8192 };
}

/**
 * Install a Playwright route interceptor that mocks all Gemini API calls.
 *
 * @param page - The Playwright page to intercept on
 * @param replies - Ordered queue of text replies returned per generateContent call.
 *                  When the queue is exhausted, returns the last reply repeatedly.
 */
export async function mockGeminiApi(
  page: Page,
  replies: MockResponse[] = [{ text: 'Mock response.' }]
): Promise<void> {
  let callIndex = 0;

  await page.route(GEMINI_API_URL, async (route: Route) => {
    const url = route.request().url();

    // Model list — used by loadApiSettings
    if (url.includes('/models?key=')) {
      await route.fulfill({ json: buildModelsListResponse() });
      return;
    }

    // Single model detail — used by initializeModelMetrics
    if (url.match(/\/models\/[^:?]+\?key=/)) {
      await route.fulfill({ json: buildModelDetailResponse() });
      return;
    }

    // Count tokens
    if (url.includes(':countTokens')) {
      await route.fulfill({ json: buildCountTokensResponse() });
      return;
    }

    // Generate content — main AI call
    if (url.includes(':generateContent')) {
      const reply = replies[Math.min(callIndex, replies.length - 1)];
      callIndex++;
      await route.fulfill({ json: buildGenerateResponse(reply) });
      return;
    }

    // Let anything else through
    await route.continue();
  });
}

/**
 * Simulates a rate-limit (429) error from Gemini for the next N generateContent calls.
 */
export async function mockGeminiRateLimit(page: Page, times = 1): Promise<void> {
  let remaining = times;
  await page.route(GEMINI_API_URL, async (route: Route) => {
    const url = route.request().url();
    if (url.includes(':generateContent') && remaining > 0) {
      remaining--;
      await route.fulfill({
        status: 429,
        json: { error: { code: 429, message: 'RESOURCE_EXHAUSTED: quota exceeded', status: 'RESOURCE_EXHAUSTED' } },
      });
      return;
    }
    await route.continue();
  });
}

/** Remove all Gemini route mocks. */
export async function unmockGeminiApi(page: Page): Promise<void> {
  await page.unroute(GEMINI_API_URL);
}
