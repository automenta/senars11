
import { test, expect } from '@playwright/test';

test.describe('Reasoning Engine UI Comprehensive Tests', () => {
  test('should load, interact with panels, and see updates', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/');

    // 2. Verify WebSocket connection is established
    await expect(page.locator('text=WebSocket Connection: Online')).toBeVisible({ timeout: 10000 });

    // 3. Verify Demo Panel functionality
    const demoPanel = page.locator('div[aria-label="Demos"]');
    await expect(demoPanel).toBeVisible();

    // Wait for the demo list to be populated
    const firstDemo = demoPanel.locator('.demo-row').first();
    await expect(firstDemo).toBeVisible({ timeout: 10000 });

    // Click the "Start" button on the first demo
    await firstDemo.getByRole('button', { name: 'Start' }).click();

    // Assert that the demo state changes to "running"
    await expect(firstDemo.locator('text=(running)')).toBeVisible();

    // 4. Verify Narsese Input functionality
    const inputPanel = page.locator('div[aria-label="Input"]');
    await expect(inputPanel).toBeVisible();

    const narseseInput = '<a --> b>.';
    await inputPanel.getByRole('textbox').fill(narseseInput);
    await inputPanel.getByRole('button', { name: 'Submit' }).click();

    // 5. Verify Task Panel is updated
    const taskPanel = page.locator('div[aria-label="Tasks"]');
    await expect(taskPanel).toBeVisible();
    await expect(taskPanel.locator(`text=${narseseInput}`)).toBeVisible();

    // 6. Verify Console Panel is updated
    const consolePanel = page.locator('div[aria-label="Console"]');
    await expect(consolePanel).toBeVisible();
    await expect(consolePanel.locator('text=/Processed:/i')).toBeVisible();
    await expect(consolePanel.locator(`text=${narseseInput}`)).toBeVisible();

    // 7. Capture a final screenshot for verification
    await page.screenshot({ path: 'ui/e2e-tests/comprehensive-test-screenshot.png' });
  });
});
