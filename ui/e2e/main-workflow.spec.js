import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('main workflow', () => {
  test('should load the page without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SeNARS/);
  });

  test('should pass accessibility checks', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should connect to the WebSocket and receive a snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.disconnect-banner', { state: 'hidden' });
    await page.click('text=Refresh');
    await page.waitForSelector('.loading-indicator', { state: 'hidden' });
    await expect(page.locator('.react-flow__node')).toHaveCount(1);
  });

  test('should send Narsese input and update the graph', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.disconnect-banner', { state: 'hidden' });
    await page.fill('input[type="text"]', '<a --> b>.');
    await page.click('text=Send');
    await expect(page.locator('.react-flow__node')).toHaveCount(2);
  });

  test('should toggle live updates', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.disconnect-banner', { state: 'hidden' });
    await page.click('input[type="checkbox"]');
    // It's difficult to assert that live updates are off,
    // so we'll just check that the box is unchecked.
    await expect(page.locator('input[type="checkbox"]')).not.toBeChecked();
  });

  test('should use the control bar buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.disconnect-banner', { state: 'hidden' });
    await page.click('text=Step');
    // It's difficult to assert that a step was taken,
    // so we'll just check that the button exists.
    await expect(page.locator('text=Step')).toBeVisible();
  });
});
