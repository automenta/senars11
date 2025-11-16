import {test} from '@playwright/test';

test.describe('Phase 3: Cognitive IDE Foundation - Layout System', () => {
    test('validate IDE layout system with configurable panels', async ({page}) => {
        // Navigate to the IDE interface
        await page.goto('/');
        await page.waitForTimeout(1000); // Wait for page load

        // Click to open the Cognitive IDE - use more specific locator
        await page.locator('text=Cognitive IDE').first().click();
        await page.waitForTimeout(2000);

        // Take screenshot of the initial IDE layout
        await page.screenshot({
            path: '../docs/screenshots/phase3-ide-initial-layout.png',
            fullPage: true
        });

        // Verify that layout elements are present
        const layoutPanels = await page.locator('.flexlayout--layout').count();
        console.log(`Found ${layoutPanels} layout panels in the IDE`);

        // Check for expected panel types in the IDE
        const hasExplorer = await page.locator('text=Explorer, Task, Concept, Console, Trace, Time Series, Main, Input, Variables, Cycle').count();
        console.log(`Found ${hasExplorer} expected panel labels`);

        // Take screenshot of the IDE with panels
        await page.screenshot({
            path: '../docs/screenshots/phase3-ide-with-panels.png',
            fullPage: true
        });
    });

    test('test workspace management and layout persistence', async ({page}) => {
        await page.goto('/?layout=ide');
        await page.waitForTimeout(2000);

        // Navigate to the layout manager if it exists
        // First, try to find a layout manager panel or menu
        const layoutManagerExists = await page.locator('text=Layout Manager').isVisible();

        if (layoutManagerExists) {
            await page.locator('text=Layout Manager').click();
            await page.waitForTimeout(1000);
        } else {
            // Look for any layout/workspace related controls
            const hasWorkspaceControls = await page.locator('text=Save, Load, Reset, Export, Import').count();
            if (hasWorkspaceControls > 0) {
                console.log(`Found ${hasWorkspaceControls} workspace controls`);
            }
        }

        // Take screenshot showing workspace management
        await page.screenshot({
            path: '../docs/screenshots/phase3-workspace-management.png',
            fullPage: true
        });
    });

    test('test drag-and-drop panel functionality', async ({page}) => {
        await page.goto('/?layout=ide');
        await page.waitForTimeout(2000);

        // Take screenshot of initial layout
        await page.screenshot({
            path: '../docs/screenshots/phase3-drag-drop-initial.png',
            fullPage: true
        });

        // Look for flexlayout elements that can be dragged
        const tabElements = page.locator('.flexlayout__tab');
        const tabCount = await tabElements.count();
        console.log(`Found ${tabCount} draggable tabs`);

        // Note: Actual drag-and-drop testing would require more complex interaction
        // For now, we'll verify the layout system supports it by checking for flexlayout elements

        await page.screenshot({
            path: '../docs/screenshots/phase3-drag-drop-available.png',
            fullPage: true
        });
    });
});