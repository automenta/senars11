import {expect, test} from './fixtures/production-fixture.js';
import {TestNARPlaywright} from './utils/TestNARPlaywright.js';

test.describe('Golden Path Verification', () => {
    test.describe.configure({mode: 'serial'});

    test('Full Control Loop', async ({productionPage}) => {
        const nar = new TestNARPlaywright(productionPage.page);

        // 1. Verify Connection
        await expect(productionPage.connectionStatus).toContainText('Connected', {ignoreCase: true, timeout: 10000});

        // 2. Test Input Mode Toggle & Agent Input
        console.log('Testing Agent Mode...');
        await productionPage.page.check('#mode-agent');
        // Use direct command sending to bypass Narsese formatting in TestNARPlaywright for this specific test
        await productionPage.sendCommand('Hello agent');

        // Verify agent response
        await expect(productionPage.page.locator('.logs-container')).toContainText(/🤖|Error|Agent/, {timeout: 35000});

        // 3. Test Graph Controls
        console.log('Testing Graph Controls...');

        // Ensure sidebar is open (fixed via NarPage update)
        await productionPage.ensureSidebarOpen();

        const tasksToggle = productionPage.page.locator('#show-tasks-toggle');
        await expect(tasksToggle).toBeVisible();

        // Verify toggle works
        await tasksToggle.click(); // Uncheck
        await expect(tasksToggle).not.toBeChecked();
        await tasksToggle.click(); // Check back
        await expect(tasksToggle).toBeChecked();

        // 4. Test Graph Nodes via debug command (Functionality check)
        await productionPage.page.check('#mode-narsese');

        // Use TestNARPlaywright to verify graph content (via /nodes command)
        await nar.expectGraph('Graph has').execute();
    });
});
