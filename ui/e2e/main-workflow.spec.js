
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Main Workflow', () => {
  let ws;

  test.beforeEach(async ({ page }) => {
    await page.route('**/ws', async (route) => {
      const webSocket = await route.handle();
      ws = webSocket;
      ws.on('framereceived', (event) => {
        const message = JSON.parse(event.payload);
        if (message.type === 'control' && message.command === 'refresh') {
          ws.send(JSON.stringify({
            type: 'memorySnapshot',
            payload: {
              concepts: [{ id: '1', term: 'ConceptA' }, { id: '2', term: 'ConceptB' }],
              tasks: [{ id: '3', term: { type: 'Implication', predicate: '1', subject: '2' } }],
            },
          }));
        }
      });
    });
    await page.goto('/');
  });

  test('should load and display the graph after refresh', async ({ page }) => {
    await page.click('text=Refresh');
    await expect(page.locator('.react-flow__node')).toHaveCount(2);
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should toggle live updates', async ({ page }) => {
    const liveUpdateToggle = page.locator('input[type="checkbox"]');
    await expect(liveUpdateToggle).toBeChecked();
    await liveUpdateToggle.uncheck();
    await expect(liveUpdateToggle).not.toBeChecked();
  });

  test('should handle WebSocket disconnect and reconnect', async ({ page }) => {
    await ws.close();
    await expect(page.locator('text=Disconnected')).toBeVisible();

    // Re-route to simulate reconnection
    await page.route('**/ws', async (route) => {
      const webSocket = await route.handle();
      ws = webSocket;
    });

    // Reload the page to trigger a new connection
    await page.reload();

    // Check if the connection is re-established
    await expect(page.locator('text=Disconnected')).not.toBeVisible();
  });

  test('should fit the graph to the view', async ({ page }) => {
    await page.click('text=Refresh');
    await page.click('text=Fit to View');
    const viewport = page.locator('.react-flow__viewport');
    await expect(viewport).toHaveAttribute('style', /transform: matrix\(.*\)/);
  });
});
