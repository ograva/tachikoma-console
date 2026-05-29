import { Page } from '@playwright/test';

/** Read a value from localStorage via page evaluate. */
export async function getLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

/** Write a value to localStorage via page evaluate. */
export async function setLocalStorage(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
}

/** Clear all localStorage. */
export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

/** Get parsed JSON from localStorage, or null. */
export async function getLocalStorageJson<T>(page: Page, key: string): Promise<T | null> {
  const raw = await getLocalStorage(page, key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

/** Seed a fake Gemini API key into localStorage (bypasses real validation). */
export async function seedApiKey(page: Page, key = 'fake-gemini-api-key-for-testing'): Promise<void> {
  await setLocalStorage(page, 'gemini_api_key', key);
}

/** Remove the chat explainer seen flag so it doesn't block tests. */
export async function suppressExplainerDialog(page: Page): Promise<void> {
  await setLocalStorage(page, 'tachikoma_chat_explainer_seen', 'true');
}

/** Navigate to the app and suppress all first-run dialogs. */
export async function gotoApp(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await suppressExplainerDialog(page);
}
