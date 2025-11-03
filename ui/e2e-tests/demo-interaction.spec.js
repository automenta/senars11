import {expect, test} from '@playwright/test';

test.describe('DemoPanel Interaction', () => {
    test('should load demos and allow interaction', async ({page}) => {
        await page.goto('/');

        // 1. Wait for the demo list to be populated.
        const demoPanel = page.locator('.flexlayout__layout').locator('div', {hasText: 'Demos'}).first();
        await expect(demoPanel).toBeVisible();

        const firstDemo = demoPanel.locator('div[key^="demo-"]').first();
        await expect(firstDemo).toBeVisible({timeout: 10000}); // Wait up to 10s for demos to load

        // 2. Start the first demo.
        const startButton = firstDemo.locator('button', {hasText: 'Start'});
        await startButton.click();
        await expect(firstDemo.locator('div', {hasText: 'running'})).toBeVisible();

        // 3. Pause the demo.
        const pauseButton = firstDemo.locator('button', {hasText: 'Pause'});
        await pauseButton.click();
        await expect(firstDemo.locator('div', {hasText: 'paused'})).toBeVisible();

        // 4. Resume the demo.
        const resumeButton = firstDemo.locator('button', {hasText: 'Resume'});
        await resumeButton.click();
        await expect(firstDemo.locator('div', {hasText: 'running'})).toBeVisible();

        // 5. Stop the demo.
        const stopButton = firstDemo.locator('button', {hasText: 'Stop'});
        await stopButton.click();
        await expect(firstDemo.locator('div', {hasText: 'stopped'})).toBeVisible();
    });
});
