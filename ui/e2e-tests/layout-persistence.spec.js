import {expect, test} from '@playwright/test';

test.describe('Layout Persistence', () => {
    test('should persist panel layout after reload', async ({page}) => {
        await page.goto('/');

        // 1. Move the "Tasks" panel to the right side of the layout.
        const tasksTab = page.locator('.flexlayout__tab_button_content', {hasText: 'Tasks'});
        const rightTabSet = page.locator('.flexlayout__tabset').last();
        await tasksTab.dragTo(rightTabSet);

        // 2. Verify the "Tasks" panel is in the new location.
        await expect(rightTabSet.locator('.flexlayout__tab_button_content', {hasText: 'Tasks'})).toBeVisible();

        // 3. Reload the page.
        await page.reload();

        // 4. Verify the "Tasks" panel is still in the new location after reload.
        await expect(rightTabSet.locator('.flexlayout__tab_button_content', {hasText: 'Tasks'})).toBeVisible();
    });
});
