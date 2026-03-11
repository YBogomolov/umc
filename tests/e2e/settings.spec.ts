import { expect, test } from './test';

test.describe('Settings E2E', () => {
  test('should open settings dialog', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Settings');

    await page.click('button:has-text("Settings")');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('should show API key input in settings', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Settings');

    await page.click('button:has-text("Settings")');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
