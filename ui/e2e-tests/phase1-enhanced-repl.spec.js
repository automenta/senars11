import {expect, test} from '@playwright/test';

test.describe('Phase 1: Foundation & Core Components - Enhanced REPL', () => {
    test('test enhanced REPL functionality and capture screenshots', async ({page}) => {
        // Navigate directly to the enhanced REPL
        await page.goto('/repl/?layout=enhanced');
        await page.waitForTimeout(3000); // Wait for page load

        // Take screenshot of enhanced REPL
        await page.screenshot({
            path: '../docs/screenshots/phase1-enhanced-repl-initial.png',
            fullPage: true
        });

        // Check that the enhanced REPL page has loaded correctly
        await expect(page.locator('text=Enhanced REPL Interface')).toBeVisible();

        // Check connection status
        const isConnected = await page.locator('text=Connected').first().isVisible().catch(() => false);
        const isDisconnected = await page.locator('text=Disconnected').first().isVisible().catch(() => false);

        console.log(`WebSocket Status: ${isConnected ? 'Connected' : isDisconnected ? 'Disconnected' : 'Unknown'}`);

        // Test input functionality - try to type in the input field
        const inputField = page.locator('input[type="text"]').first();
        if (await inputField.isVisible()) {
            await inputField.fill('<test --> input>.');

            // Take screenshot after typing
            await page.screenshot({
                path: '../docs/screenshots/phase1-repl-with-input.png',
                fullPage: true
            });

            // Submit the input
            await page.locator('button', {hasText: 'Submit'}).first().click();

            // Wait for response and take another screenshot
            await page.waitForTimeout(1000);
            await page.screenshot({
                path: '../docs/screenshots/phase1-repl-after-submit.png',
                fullPage: true
            });
        }
    });

    test('test WebSocket connection state and error handling', async ({page}) => {
        // Navigate to enhanced REPL
        await page.goto('/repl/?layout=enhanced');
        await page.waitForTimeout(2000);

        // Check connection status indicator
        const connectionStatus = page.locator('text=Connected, Disconnected').first();
        await expect(connectionStatus).toBeVisible();

        // Take screenshot of connection status
        await page.screenshot({
            path: '../docs/screenshots/phase1-websocket-status.png',
            fullPage: true
        });

        // Check for error boundary or fallback content if not connected
        if (await page.locator('text=Not connected to backend').isVisible()) {
            console.log('Backend connection not available - showing fallback content');
        }
    });
});