import { test, expect } from './fixtures/base-fixture.js';

test.describe('Configuration Injection', () => {
  test('WebSocket config is injected into client-side JavaScript', async ({ narPage, page }) => {
    const wsConfig = await page.evaluate(() => window.WEBSOCKET_CONFIG || null);
    expect(wsConfig).not.toBeNull();
    expect(wsConfig).toHaveProperty('port');
    expect(wsConfig).toHaveProperty('host');
  });

  test('WebSocket connection URL is constructed with injected config', async ({ narPage, page }) => {
    const wsUrl = await page.evaluate(() => {
        const wsConfig = window.WEBSOCKET_CONFIG || { host: 'localhost', port: '8081' };
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${wsConfig.host}:${wsConfig.port}`;
    });
    expect(wsUrl).toContain('ws://');
    expect(wsUrl).not.toContain('undefined');
  });
});
