import {test, expect} from '@playwright/test';

test.describe('Phase 0: Assessment & Validation Foundation', () => {
  test('document current UI state with screenshots', async ({page}) => {
    // Navigate to the launcher
    await page.goto('/');
    
    // Take screenshot of launcher page
    await page.screenshot({ 
      path: 'docs/screenshots/phase0-launcher-current-state.png',
      fullPage: true 
    });
    
    // Verify basic page elements are present
    await expect(page.locator('text=SeNARS Web UI Launcher')).toBeVisible();
    await expect(page.locator('text=Select an Interface to Begin')).toBeVisible();
    
    // Document WebSocket connection status - handle multiple elements properly
    const isConnected = await page.locator('text=Connected').first().isVisible().catch(() => false);
    const isDisconnected = await page.locator('text=Disconnected').first().isVisible().catch(() => false);

    console.log(`WebSocket Connection Status: ${isConnected ? 'Connected' : isDisconnected ? 'Disconnected' : 'Unknown'}`);
    
    // Take screenshot of diagnostic panel
    await expect(page.locator('text=System Status & Diagnostics')).toBeVisible();
    await page.locator('text=Test Connection').click();
    await page.waitForTimeout(1000); // Wait for test results
    
    // Screenshot after connection test
    await page.screenshot({ 
      path: 'docs/screenshots/phase0-diagnostics-after-test.png',
      fullPage: true 
    });
    
    // Check REPL functionality - use more specific selector to avoid ambiguity
    await page.locator('text=REPL Interface').first().click();
    await page.waitForTimeout(2000); // Wait for page load
    
    // Take screenshot of REPL
    await page.screenshot({ 
      path: 'docs/screenshots/phase0-repl-state.png',
      fullPage: true 
    });

    // Return to launcher
    await page.goto('/');
    await expect(page.locator('text=SeNARS Web UI Launcher')).toBeVisible();
  });

  test('component health matrix - identify broken components', async ({page}) => {
    // Navigate to main launcher
    await page.goto('/');
    
    // Check for component availability and document which are working/broken
    const components = [
      { name: 'Launcher', selector: 'text=SeNARS Web UI Launcher', expected: true },
      { name: 'WebSocket', selector: 'text=Connected', expected: false, useFirst: true }, // Expected to be disconnected initially
      { name: 'Cognitive IDE', selector: 'text=Cognitive IDE', expected: true },
      { name: 'REPL Interface', selector: 'text=REPL Interface', expected: true, useFirst: true },
      { name: 'Minimal REPL', selector: 'text=Minimal REPL', expected: true },
      { name: 'Simple UI', selector: 'text=Simple UI Collection', expected: true },
      { name: 'Graph UI', selector: 'text=Graph UI', expected: true },
      { name: 'Self Analysis', selector: 'text=Self Analysis', expected: true },
    ];

    const results = [];
    for (const comp of components) {
      try {
        let locator = page.locator(comp.selector);
        if (comp.useFirst) {
          locator = locator.first();
        }
        const isVisible = await locator.isVisible().catch(() => false);
        results.push({
          name: comp.name,
          found: isVisible,
          expected: comp.expected,
          status: isVisible === comp.expected ? 'OK' : 'BROKEN'
        });
      } catch (error) {
        results.push({
          name: comp.name,
          found: false,
          expected: comp.expected,
          status: 'ERROR',
          error: error.message
        });
      }
    }
    
    // Log component health results
    console.table(results);
    
    // Verify diagnostic panel functionality
    await expect(page.locator('text=System Status & Diagnostics')).toBeVisible();
    await expect(page.locator('text=Test Connection')).toBeVisible();
    await expect(page.locator('text=Get Backend Info')).toBeVisible();
    await expect(page.locator('text=Force Reconnect')).toBeVisible();
  });

  test('document backend connection issues', async ({page}) => {
    // Go to launcher and document backend connection status
    await page.goto('/');
    
    // Check WebSocket connection status
    const wsConnected = await page.locator('text=Connected').count() > 0;
    const wsDisconnected = await page.locator('text=Disconnected').count() > 0;
    const wsStatus = wsConnected ? 'Connected' : wsDisconnected ? 'Disconnected' : 'Unknown';
    
    console.log(`WebSocket Status: ${wsStatus}`);
    
    // Look for connection error indicators
    const hasWsError = await page.locator('text=WebSocket Disconnected').isVisible();
    const hasConnectionError = await page.locator('text=connection error').isVisible() || 
                               await page.locator('text=Error').isVisible();
    
    console.log(`Has WebSocket Error Display: ${hasWsError}`);
    console.log(`Has Connection Error: ${hasConnectionError}`);
  });
});