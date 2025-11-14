import {test, expect} from '@playwright/test';

test.describe('Phase 1: Debug Enhanced REPL Loading', () => {
  test('debug what renders on /repl/?layout=enhanced', async ({page}) => {
    await page.goto('/repl/?layout=enhanced');
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see what's actually rendered
    await page.screenshot({ 
      path: '../docs/screenshots/phase1-debug-enhanced-repl.png',
      fullPage: true 
    });
    
    // Get all text content to see what's available
    const bodyText = await page.textContent('body');
    console.log('Body text content:', bodyText.substring(0, 500) + '...');
    
    // Check for any error messages
    const errors = await page.locator('text=Error').count();
    const errors2 = await page.locator('text=error').count();
    console.log(`Found ${errors + errors2} error references`);
    
    // Look for any heading text on the page
    const heading = await page.locator('h1, h2, h3').allTextContents();
    console.log('Headings found:', heading);
  });
  
  test('test basic repl loading first', async ({page}) => {
    // First test that basic repl works
    await page.goto('/repl/');
    await page.waitForTimeout(3000); 
    
    await page.screenshot({ 
      path: '../docs/screenshots/phase1-debug-basic-repl.png',
      fullPage: true 
    });
    
    const title = await page.locator('text=REPL Interface, Minimal REPL Interface, Enhanced REPL Interface').count();
    console.log(`Found ${title} REPL interface titles`);
  });
});