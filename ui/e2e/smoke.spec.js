// @ts-check
import { test, expect } from '@playwright/test';

test('homepage has expected text', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('p')).toContainText('Hello World');
});
