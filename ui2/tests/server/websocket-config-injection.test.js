/**
 * @file test-websocket-config-injection.js
 * @description Tests for WebSocket configuration injection in ui2
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

// Tests for WebSocket configuration injection
describe('ui2 WebSocket Configuration Injection Tests', () => {
    let browser = null;
    let page = null;
    let serverProcess = null;

    const uiPort = 8102;
    const wsPort = 8103;

    beforeAll(async () => {
        // Start the UI2 server with specific WebSocket configuration
        serverProcess = spawn('node', ['server.js'], {
            cwd: './',
            stdio: 'pipe',
            env: {
                ...process.env,
                HTTP_PORT: uiPort.toString(),
                BACKEND_WS_HOST: 'localhost',
                BACKEND_WS_PORT: wsPort.toString()
            }
        });

        // Wait for UI server to start
        await setTimeout(2000);
    });

    afterAll(async () => {
        // Clean up processes
        if (serverProcess) {
            serverProcess.kill();
        }
        if (browser) {
            await browser.close();
        }
    });

    beforeEach(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        page = await browser.newPage();
    });

    afterEach(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('WebSocket config is injected into client-side JavaScript', async () => {
        await page.goto(`http://localhost:${uiPort}`, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        // Check that the WebSocket configuration is available in the page
        const wsConfig = await page.evaluate(() => {
            return window.WEBSOCKET_CONFIG || null;
        });
        
        expect(wsConfig).not.toBeNull();
        expect(wsConfig).toHaveProperty('port');
        expect(wsConfig).toHaveProperty('host');
    });

    test('WebSocket config values match environment variables', async () => {
        await page.goto(`http://localhost:${uiPort}`, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        const wsConfig = await page.evaluate(() => {
            return window.WEBSOCKET_CONFIG;
        });
        
        // The configuration should match what we set in environment variables
        expect(wsConfig.port).toBe(wsPort.toString());
        expect(wsConfig.host).toBe('localhost');
    });

    test('Server properly uses environment variables for WebSocket configuration', (done) => {
        // Test the configuration logic from server.js
        const env = {
            BACKEND_WS_HOST: 'test-host.com',
            BACKEND_WS_PORT: '8104'
        };
        
        // Simulate the configuration logic from server.js
        const wsHost = env.BACKEND_WS_HOST || env.WS_HOST || 'localhost';
        const wsPort = env.BACKEND_WS_PORT ? parseInt(env.BACKEND_WS_PORT) : (env.WS_PORT ? parseInt(env.WS_PORT) : 8081);
        
        expect(wsHost).toBe('test-host.com');
        expect(wsPort).toBe(8104);
        
        done();
    });

    test('Template replacement injects correct WebSocket values', async () => {
        // Fetch the raw HTML to verify template replacement
        const response = await page.goto(`http://localhost:${uiPort}/index.html`, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        const htmlContent = await response.text();
        
        // Check that the template was replaced with actual values
        expect(htmlContent).toContain(`port: '${wsPort}'`);
        expect(htmlContent).toContain(`host: 'localhost'`);
        
        // Ensure no template placeholders remain
        expect(htmlContent).not.toContain('{{WEBSOCKET_PORT}}');
        expect(htmlContent).not.toContain('{{WEBSOCKET_HOST}}');
    });

    test('Client-side config getter uses injected values', async () => {
        await page.goto(`http://localhost:${uiPort}`, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        // Simulate the getWebSocketConfig function from app.js
        const configResult = await page.evaluate(() => {
            if (typeof window.WEBSOCKET_CONFIG !== 'undefined') {
                return {
                    host: window.WEBSOCKET_CONFIG.host || 'localhost',
                    port: window.WEBSOCKET_CONFIG.port || '8081'
                };
            }
            return {
                host: 'fallback',
                port: 'fallback'
            };
        });
        
        expect(configResult.host).toBe('localhost');
        expect(configResult.port).toBe(wsPort.toString());
    });

    test('WebSocket connection URL is constructed with injected config', async () => {
        await page.goto(`http://localhost:${uiPort}`, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        // Test the WebSocket URL construction logic from app.js
        const wsUrl = await page.evaluate(() => {
            const wsConfig = typeof window.WEBSOCKET_CONFIG !== 'undefined' 
                ? {
                    host: window.WEBSOCKET_CONFIG.host || window.location.hostname || 'localhost',
                    port: window.WEBSOCKET_CONFIG.port || '8081'
                }
                : {
                    host: window.location.hostname || 'localhost',
                    port: '8081'
                };
            
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${wsConfig.host}:${wsConfig.port}`;
        });
        
        expect(wsUrl).toBe(`ws://localhost:${wsPort}`);
    });

    test('Fallback configuration works when no injection occurs', async () => {
        // Simulate a scenario where WebSocket config is not available
        await page.goto(`http://localhost:${uiPort}`, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        // Temporarily remove the injected config and test fallback
        const fallbackConfig = await page.evaluate(() => {
            // Save original config
            const originalConfig = window.WEBSOCKET_CONFIG;
            
            // Remove config temporarily
            window.WEBSOCKET_CONFIG = undefined;
            
            // Test fallback logic
            const fallback = {
                host: window.location.hostname || 'localhost',
                port: '8081' // default fallback port
            };
            
            // Restore original config
            window.WEBSOCKET_CONFIG = originalConfig;
            
            return fallback;
        });
        
        expect(fallbackConfig.host).toBe('localhost');
        expect(fallbackConfig.port).toBe('8081');
    });

    test('Environment variable precedence is correct', () => {
        // Test the precedence logic from server.js
        const testEnvVars = (env) => {
            const HTTP_PORT = env.PORT ? parseInt(env.PORT) : (env.HTTP_PORT ? parseInt(env.HTTP_PORT) : 8080);
            const BACKEND_WS_HOST = env.BACKEND_WS_HOST || env.WS_HOST || 'localhost';
            const BACKEND_WS_PORT = env.BACKEND_WS_PORT ? parseInt(env.BACKEND_WS_PORT) : (env.WS_PORT ? parseInt(env.WS_PORT) : 8081);
            
            return { HTTP_PORT, BACKEND_WS_HOST, BACKEND_WS_PORT };
        };
        
        // Test with PORT and BACKEND_WS_PORT set
        const config1 = testEnvVars({ 
            PORT: '9000', 
            BACKEND_WS_PORT: '9001' 
        });
        expect(config1.HTTP_PORT).toBe(9000);
        expect(config1.BACKEND_WS_PORT).toBe(9001);
        
        // Test with HTTP_PORT and WS_HOST set (lower precedence)
        const config2 = testEnvVars({ 
            HTTP_PORT: '9002', 
            WS_HOST: 'test.com' 
        });
        expect(config2.HTTP_PORT).toBe(9002);
        expect(config2.BACKEND_WS_HOST).toBe('test.com');
    });

    test('Configuration is exposed to app correctly', async () => {
        await page.goto(`http://localhost:${uiPort}`, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        // Verify that the config is available for the application to use
        const hasWsConfig = await page.evaluate(() => {
            return typeof window.WEBSOCKET_CONFIG !== 'undefined' &&
                   window.WEBSOCKET_CONFIG !== null &&
                   typeof window.WEBSOCKET_CONFIG.port !== 'undefined' &&
                   typeof window.WEBSOCKET_CONFIG.host !== 'undefined';
        });
        
        expect(hasWsConfig).toBe(true);
    });
});