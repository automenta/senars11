import {expect, test} from '@playwright/test';

test.describe('Reasoning Engine UI Tests', () => {
    test('should load and display the root component', async ({page}) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Reasoning Engine UI/);
    });
});