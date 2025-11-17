import {expect, test} from '@playwright/test';

test.describe('Phase 0: Simple Assessment', () => {
    test('document current UI state with screenshots', async ({page}) => {
        // Navigate to the launcher
        await page.goto('/');

        // Take screenshot of launcher page - use absolute path relative to project root
        await page.screenshot({
            path: '../docs/screenshots/phase0-launcher-current-state.png',
            fullPage: true
        });

        // Verify basic page elements are present
        await expect(page.locator('text=SeNARS Web UI Launcher')).toBeVisible();
        await expect(page.locator('text=Select an Interface to Begin')).toBeVisible();

        // Check WebSocket status - use more specific selector
        const actualConnected = await page.locator('text=Connected').first().isVisible().catch(() => false);
        const actualDisconnected = await page.locator('text=Disconnected').first().isVisible().catch(() => false);

        console.log(`WebSocket Status: ${actualConnected ? 'Connected' : actualDisconnected ? 'Disconnected' : 'Unknown'}`);

        // Take screenshot of diagnostic panel
        await expect(page.locator('text=System Status & Diagnostics')).toBeVisible();

        // Test connection and take screenshot
        const testButton = page.locator('text=Test Connection').first();
        if (await testButton.isVisible()) {
            await testButton.click();
            await page.waitForTimeout(1000); // Wait for test results
        }

        // Screenshot after connection test
        await page.screenshot({
            path: '../docs/screenshots/phase0-diagnostics-after-test.png',
            fullPage: true
        });

        // Check REPL functionality with specific selector
        await page.locator('text=REPL Interface').first().click();
        await page.waitForTimeout(2000); // Wait for page load

        // Take screenshot of REPL
        await page.screenshot({
            path: '../docs/screenshots/phase0-repl-state.png',
            fullPage: true
        });

        // Return to launcher to make sure navigation works
        await page.goto('/');
        await expect(page.locator('text=SeNARS Web UI Launcher')).toBeVisible();
    });
});