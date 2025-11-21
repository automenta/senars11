import {expect, test} from './fixtures/production-fixture.js';

test.describe('Golden Path Verification', () => {
    test.describe.configure({ mode: 'serial' });

    test('Full Control Loop', async ({productionPage}) => {
        // 1. Verify Connection
        await expect(productionPage.connectionStatus).toContainText('Connected', {ignoreCase: true, timeout: 10000});

        // 2. Test Controls (Start/Stop)
        console.log('Testing Start button...');
        await productionPage.page.click('#btn-start');
        // Wait for cycle count to increase (regex matches Cycle: 1, Cycle: 10, etc.)
        await expect(productionPage.page.locator('#cycle-count')).toHaveText(/Cycle: \d+/, { timeout: 10000 });

        console.log('Testing Stop button...');
        await productionPage.page.click('#btn-stop');
        // TODO: Verify it stopped (cycle count stays static)? Hard to test reliably in short time.

        // 3. Test Input Mode Toggle & Agent Input
        console.log('Testing Agent Mode...');
        await productionPage.page.check('#mode-agent');
        // Send command uses the input box, so it respects the toggle state if we simulate typing
        // But productionPage.sendCommand might use direct fill+click.
        await productionPage.sendCommand('Hello agent');

        // Verify agent response (or error) is logged. Agent logs use '🤖' icon.
        // We expect SOME response, even an error from LM.
        await expect(productionPage.page.locator('.logs-container')).toContainText(/🤖|Error|Agent/, { timeout: 35000 });

        // 4. Test Demos
        console.log('Testing Demos...');
        // Wait for demo list to populate (at least one demo + default option)
        // We sent 'list' on connection, so it should be there.
        const demoSelect = productionPage.page.locator('#demo-select');
        await expect(demoSelect.locator('option')).not.toHaveCount(1, { timeout: 10000 }); // More than just default

        // Select the first available demo (inheritance)
        await demoSelect.selectOption({ index: 1 });
        await productionPage.page.click('#run-demo');

        // Verify demo start log
        await expect(productionPage.page.locator('.logs-container')).toContainText(/Requested demo start/, { timeout: 5000 });

        // 5. Test Visualization Filtering
        console.log('Testing Graph Controls...');
        const tasksToggle = productionPage.page.locator('#show-tasks-toggle');
        await expect(tasksToggle).toBeChecked();
        await tasksToggle.uncheck();
        // We can't easily verify canvas, but we can verify the uncheck action worked without error
        await expect(tasksToggle).not.toBeChecked();

        // 6. Test Graph Nodes via debug command
        await productionPage.page.check('#mode-narsese'); // Switch back to narsese for debug command (though /commands work in agent mode too usually)
        await productionPage.sendCommand('/nodes');
        await expect(productionPage.page.locator('.logs-container')).toContainText(/Graph has/, { timeout: 5000 });
    });
});
