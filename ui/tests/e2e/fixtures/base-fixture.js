
import { test as base, expect } from '@playwright/test';
import { NarPage } from '../utils/NarPage.js';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

// Fixture to manage the backend (Mock or Real)
// Currently, we rely on the global webServer for the UI.
// But for specific tests, we might want to control the backend.
// However, `playwright.config.js` launches a 'test-server.js' which includes a Mock Backend.
// If we want to test against the REAL backend, we might need a separate project or worker.

// For now, let's assume the global test-server is sufficient for most "UI" tests (mocked backend).
// For "Production" tests, we need to spawn the real backend.

export const test = base.extend({
  narPage: async ({ page }, use) => {
    const narPage = new NarPage(page);
    await narPage.goto();
    await narPage.waitForConnection();
    await use(narPage);
  },
});

export { expect };
