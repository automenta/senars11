
import { test, expect } from './fixtures/base-fixture.js';

test.describe('UI Verification', () => {
  test('WebSocket connection maintains state consistency', async ({ narPage }) => {
    await narPage.sendCommand('<bird --> flyer>.');
    await narPage.expectLog('> <bird --> flyer>.');
    // Verify connection status is still connected
    await expect(narPage.connectionStatus).toContainText('Connected', { ignoreCase: true });
  });

  test('All UI components are functional', async ({ narPage }) => {
    await expect(narPage.commandInput).toBeVisible();
    await expect(narPage.sendButton).toBeVisible();
    await expect(narPage.logsContainer).toBeVisible();
    await expect(narPage.graphContainer).toBeVisible();

    // Refresh button
    await narPage.refreshGraph();

    // Clear logs button
    await narPage.clearLogs();
  });

  test('Message handling is robust', async ({ narPage }) => {
    const commands = [
        '<bird --> flyer>.',
        '<cat --> animal>.',
        '<dog --> pet>?',
        '*step'
    ];

    for (const cmd of commands) {
        await narPage.sendCommand(cmd);
        await narPage.page.waitForTimeout(300); // Brief pause
    }

    for (const cmd of commands) {
        await narPage.expectLog(cmd);
    }
  });
});
