import { expect, test } from './test';

test.describe('Mini Creation E2E', () => {
  test('should show mini creation UI elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Collections');

    // With no collection, the sidebar shows "No collections" message
    await expect(page.getByText('No collections yet')).toBeVisible();
  });
});
