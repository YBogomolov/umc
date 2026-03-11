import { type Page, test as base, expect } from '@playwright/test';

const TEST_API_KEY = 'test-api-key-for-e2e';

async function setApiKey(page: Page) {
  await page.addInitScript((key) => {
    window.localStorage.setItem('umc_api_key', key);
  }, TEST_API_KEY);
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await setApiKey(page);
    await use(page);
  },
});

export { expect };
