/**
 * @file Playwright E2E test for manual verification of the main UI workflow.
 */
import { test, expect } from '@playwright/test';

test.describe('SeNARS UI Manual Verification', () => {
  test('should load the graph, respond to live updates, and toggle them off', async ({ page }) => {
    // 1. Navigate to the application
    await page.goto('http://localhost:5173');

    // Wait for the UI to be ready by checking for the refresh button
    await expect(page.locator('[data-testid="refresh-button"]')).toBeVisible({ timeout: 10000 });

    // 2. Click "Refresh View" to load the initial snapshot
    await page.click('[data-testid="refresh-button"]');

    // 3. Verify the graph renders nodes
    await expect(page.locator('.react-flow__node')).toHaveCount(5, { timeout: 15000 });

    // 4. Send a Narsese command to trigger a live update
    const narseseInput = page.locator('[data-testid="narsese-input"]');
    await narseseInput.fill('<(cat chases mouse) --> animal_activity>.');
    await narseseInput.press('Enter');

    // 5. Verify the view updates with a new concept
    await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 15000 });

    // 6. Toggle "Live Update" off
    const liveUpdateToggle = page.locator('[data-testid="live-update-toggle"]');
    await liveUpdateToggle.uncheck();

    // 7. Send another command
    await narseseInput.fill('<(dog barks) --> animal_activity>.');
    await narseseInput.press('Enter');

    // 8. Verify the view does NOT change
    await page.waitForTimeout(2000);
    await expect(page.locator('.react-flow__node')).toHaveCount(6);

    // 9. Take a screenshot for visual confirmation
    await page.screenshot({ path: 'ui/e2e/verification_screenshot.png' });
  });
});
