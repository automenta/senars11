import {test, expect} from '@playwright/test';

test.describe('Phase 1: Debug Console Errors', () => {
  test('debug console errors on enhanced REPL', async ({page}) => {
    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        console.log(`Console Warning: ${msg.text()}`);
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log(`Page Error: ${error.message}`);
      console.log(`Stack: ${error.stack}`);
    });

    await page.goto('/repl/?layout=enhanced');
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see what's actually rendered
    await page.screenshot({ 
      path: '../docs/screenshots/phase1-debug-enhanced-repl-error.png',
      fullPage: true 
    });
  });
  
  test('debug console errors on basic REPL', async ({page}) => {
    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        console.log(`Console Warning: ${msg.text()}`);
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log(`Page Error: ${error.message}`);
      console.log(`Stack: ${error.stack}`);
    });

    await page.goto('/repl/');
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see what's actually rendered
    await page.screenshot({ 
      path: '../docs/screenshots/phase1-debug-basic-repl-error.png',
      fullPage: true 
    });
  });
});