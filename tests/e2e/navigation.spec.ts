import { expect, test } from './test';

test.describe('Navigation E2E', () => {
  test('should show collections sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Collections');

    await expect(page.getByText('Collections', { exact: true })).toBeVisible();
  });

  test('should show settings button', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Settings');

    await expect(page.locator('button:has-text("Settings")')).toBeVisible();
  });

  test('should open settings dialog', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Settings');

    await page.click('button:has-text("Settings")');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });
});
