import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Global setup file for tests
  globalSetup: './global-setup.js',
  
  // Run tests only on Chromium in headless mode
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        headless: true,  // Run in headless mode
      },
    },
  ],
  
  // Test directory
  testDir: './e2e-tests',
  
  // Maximum time one test can run for
  timeout: 30000,
  
  // Expect timeout
  expect: {
    timeout: 5000
  },
  
  // Forbid test.only on CI
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ],
});