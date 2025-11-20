import { test, expect } from './fixtures/base-fixture.js';

test.describe('Graph Visualization', () => {
  test('Graph container is present and visible', async ({ narPage }) => {
    await expect(narPage.graphContainer).toBeVisible();
  });

  test('Graph refresh functionality works', async ({ narPage }) => {
    await narPage.refreshGraph();
  });

  test('Graph handles concept creation messages', async ({ narPage }) => {
    await narPage.sendCommand('<new_concept --> type>.');
    await narPage.expectLog('new_concept');
  });

  test('Live toggle functionality works', async ({ narPage, page }) => {
    // Ensure navigation via narPage fixture
    const toggleBtn = page.locator('#toggle-live');
    await expect(toggleBtn).toHaveText('Pause Live');
    await toggleBtn.click();
    await expect(toggleBtn).toHaveText('Resume Live');
  });
});
