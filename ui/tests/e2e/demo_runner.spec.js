import { test, expect } from '@playwright/test';

test.describe('Demo Runner', () => {
    test('loads and lists examples', async ({ page }) => {
        page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
        page.on('pageerror', exception => console.log(`PAGE ERROR: ${exception}`));
        page.on('response', response => {
            if (response.status() === 404)
                console.log(`404 NOT FOUND: ${response.url()}`);
        });

        await page.goto('/demo.html');
        await expect(page).toHaveTitle(/Demo Runner/);

        // Check if example browser is present
        const examplesComponent = page.locator('.example-browser');
        await expect(examplesComponent).toBeAttached();

        // Debug visibility
        if (!(await examplesComponent.isVisible())) {
            console.log('Examples component attached but not visible. Bounding box:', await examplesComponent.boundingBox());
            const html = await page.content();
            console.log('Page HTML snippet:', html.substring(0, 1000));
        }
        await expect(examplesComponent).toBeVisible();

        // Check if REPL IS present (fixed)
        const replInput = page.locator('.repl-input-area');
        await expect(replInput).toBeVisible();
    });

    test('Clicking a demo loads it into REPL', async ({ page }) => {
        await page.goto('/demo.html');

        // Switch to tree view for easier selection
        const modeSelect = page.locator('select');
        await modeSelect.selectOption('tree');

        // Locate a file
        const fileBtn = page.locator('button[data-path="examples/scripts/basic-reasoning.nars"]');
        await fileBtn.click();

        // Verify REPL is present and has loaded content
        const replInput = page.locator('.repl-input-area');
        await expect(replInput).toBeVisible();

        // Check if any cell was added (e.g. user input or comment)
        const cells = page.locator('.repl-cell');
        await expect(cells.first()).toBeVisible();

        // Wait for reasoning output (any non-input cell, or just wait a bit)
        await page.waitForTimeout(2000);

        // Take a screenshot regardless of specific text presence
        await page.screenshot({ path: 'ui/tests/e2e/screenshots/demo-runner-active.png', fullPage: true });

        // Check if we have cells
        const count = await page.locator('.repl-cell').count();
        expect(count).toBeGreaterThan(0);
    });
});
