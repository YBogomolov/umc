import { expect, test } from './test';

test.describe('Collections E2E', () => {
  test('should show new collection button in header', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Collections');

    // The + button should be visible
    const addButton = page.locator('button[title="New collection"]');
    await expect(addButton).toBeVisible();
  });

  test('should show empty state message', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Collections');

    await expect(page.getByText('No collections yet')).toBeVisible();
  });
});
