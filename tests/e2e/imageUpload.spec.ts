import { expect, test } from './test';

test.describe('Image Upload E2E', () => {
  test('should show empty state when no collection exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Collections');

    await expect(page.locator('text=No collections yet')).toBeVisible();
  });
});
