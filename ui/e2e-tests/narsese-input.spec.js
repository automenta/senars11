import {expect, test} from '@playwright/test';

test.describe('Narsese Input End-to-End', () => {
    test('should handle Narsese input and update panels', async ({page}) => {
        await page.goto('/');

        // 1. Locate the InputInterfacePanel and submit a Narsese statement.
        const inputPanel = page.locator('.flexlayout__layout').locator('div', {hasText: 'Input'}).first();
        await expect(inputPanel).toBeVisible();

        const inputField = inputPanel.locator('input[type="text"]');
        await inputField.fill('(cat --> animal).');
        await inputField.press('Enter');

        // 2. Verify a success notification appears in the ConsolePanel.
        const consolePanel = page.locator('.flexlayout__layout').locator('div', {hasText: 'Console'}).first();
        await expect(consolePanel.locator('div', {hasText: 'Narsese Input Success'})).toBeVisible();

        // 3. Verify a new task appears in the TaskPanel.
        const taskPanel = page.locator('.flexlayout__layout').locator('div', {hasText: 'Tasks'}).first();
        await expect(taskPanel.locator('div', {hasText: '(cat --> animal).'})).toBeVisible();

        // 4. Verify new concepts appear in the ConceptPanel.
        const conceptPanel = page.locator('.flexlayout__layout').locator('div', {hasText: 'Concepts'}).first();
        await expect(conceptPanel.locator('div', {hasText: 'cat'})).toBeVisible();
        await expect(conceptPanel.locator('div', {hasText: 'animal'})).toBeVisible();
    });
});
