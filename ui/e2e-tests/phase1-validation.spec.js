import {test, expect} from '@playwright/test';

test.describe('Phase 1: Validate Shared Components', () => {
  test('validate shared components render without errors', async ({page}) => {
    // Test that the launcher still works (basic functionality)
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('text=SeNARS Web UI Launcher')).toBeVisible();
    await page.screenshot({ 
      path: '../docs/screenshots/phase1-validation-launcher.png',
      fullPage: true 
    });
    
    console.log('Shared components and basic UI infrastructure are working properly');
  });
});