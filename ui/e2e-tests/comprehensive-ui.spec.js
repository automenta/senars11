import {expect, test} from '@playwright/test';

test.describe('Comprehensive UI Functionality Tests', () => {
    test('should load, interact with demos, submit Narsese, and reflect updates', async ({page}) => {
        // 1. Navigate to the app and wait for the WebSocket to connect.
        await page.goto('/');

        // Wait for the connection status to be "Online"
        const connectionStatus = page.locator('text=WebSocket Connection: Online');
        await expect(connectionStatus).toBeVisible({timeout: 10000});

        // 2. Verify DemoPanel functionality.
        // Wait for the demo list to be populated. We'll look for the first "Start" button.
        const firstDemoStartButton = page.locator('button:has-text("Start")').first();
        await expect(firstDemoStartButton).toBeVisible({timeout: 15000}); // Demos can take a moment to load

        // Click the "Start" button on the first demo.
        await firstDemoStartButton.click();

        // Assert that the demo's state changes to "running".
        const runningStatus = page.locator('text=running').first();
        await expect(runningStatus).toBeVisible({timeout: 5000});

        // 3. Verify Narsese input and its effects.
        // Find the input panel textarea and submit a Narsese statement.
        const narseseInput = page.locator('textarea[placeholder="Enter Narsese input here..."]');
        await expect(narseseInput).toBeVisible();
        const inputStatement = '<a --> b>.';
        await narseseInput.fill(inputStatement);

        const submitButton = page.locator('button:has-text("Submit")');
        await submitButton.click();

        // 4. Verify that the submitted task appears in the TaskPanel.
        const taskPanel = page.locator('div:has-text("Tasks")').locator("xpath=..").locator("xpath=.."); // Navigate up to the panel container
        const newTask = taskPanel.locator(`text=${inputStatement}`);
        await expect(newTask).toBeVisible({timeout: 5000});

        // 5. Verify a success notification appears in the ConsolePanel (re-purposed notifications).
        const consolePanel = page.locator('div:has-text("Console")').locator("xpath=..").locator("xpath=.."); // Navigate up to the panel container
        const successMessage = consolePanel.locator('text=/SUCCESS: Processed:/i'); // Match text like "SUCCESS: Processed: <a --> b>."
        await expect(successMessage).toBeVisible({timeout: 5000});

        // 6. Capture a final screenshot for verification.
        await page.screenshot({path: 'ui/e2e-tests/comprehensive-ui-test.png', fullPage: true});
    });
});
