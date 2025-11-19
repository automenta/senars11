/**
 * @file test-debug-commands.js
 * @description Tests for all debug commands in ui
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

// Tests for debug commands functionality
describe('ui Debug Commands Tests', () => {
    let browser = null;
    let page = null;
    let serverProcess = null;
    let mockBackendProcess = null;

    const uiPort = 8096;
    const wsPort = 8097;

    beforeAll(async () => {
        // Start a mock backend server
        mockBackendProcess = spawn('node', ['-e', `
            import { WebSocketServer } from 'ws';
            
            const wss = new WebSocketServer({ port: ${wsPort} });
            
            wss.on('connection', (ws) => {
                ws.on('message', (message) => {
                    const parsed = JSON.parse(message.toString());
                    
                    // For debug commands, just acknowledge receipt
                    ws.send(JSON.stringify({
                        type: 'info',
                        payload: { message: 'Acknowledged: ' + parsed.type }
                    }));
                });
            });
        `], {
            stdio: 'pipe',
            shell: true
        });

        // Wait for mock backend to start
        await setTimeout(2000);

        // Start the UI server
        serverProcess = spawn('node', ['server.js'], {
            cwd: './',
            stdio: 'pipe',
            env: {
                ...process.env,
                HTTP_PORT: uiPort.toString(),
                WS_PORT: wsPort.toString()
            }
        });

        // Wait for UI server to start
        await setTimeout(2000);
    });

    afterAll(async () => {
        // Clean up processes
        if (mockBackendProcess) {
            mockBackendProcess.kill();
        }
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
        
        await page.goto(`http://localhost:${uiPort}`, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        // Wait for connection
        await page.waitForFunction(() => {
            const statusElement = document.querySelector('#connection-status');
            return statusElement && statusElement.textContent.toLowerCase().includes('connected');
        }, { timeout: 10000 });
    });

    afterEach(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('/help command shows available commands', async () => {
        await page.type('#command-input', '/help');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Available debug commands:');
        }, { timeout: 5000 });
        
        // Check for specific commands
        const logsContent = await page.$eval('#logs-container', el => el.textContent);
        expect(logsContent).toContain('/help');
        expect(logsContent).toContain('/state');
        expect(logsContent).toContain('/nodes');
        expect(logsContent).toContain('/tasks');
        expect(logsContent).toContain('/concepts');
        expect(logsContent).toContain('/refresh');
        expect(logsContent).toContain('/clear');
    });

    test('/state command shows status information', async () => {
        await page.type('#command-input', '/state');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Connection:');
        }, { timeout: 5000 });
        
        const logsContent = await page.$eval('#logs-container', el => el.textContent);
        expect(logsContent).toContain('Connection:');
        expect(logsContent).toContain('Message Count:');
        expect(logsContent).toContain('Command History:');
    });

    test('/nodes command shows graph nodes', async () => {
        await page.type('#command-input', '/nodes');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && (logs.textContent.includes('Graph has') || 
                           logs.textContent.includes('Graph not initialized'));
        }, { timeout: 5000 });
    });

    test('/tasks command shows task nodes', async () => {
        await page.type('#command-input', '/tasks');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && (logs.textContent.includes('task nodes') || 
                           logs.textContent.includes('Graph not initialized'));
        }, { timeout: 5000 });
    });

    test('/concepts command shows concept nodes', async () => {
        await page.type('#command-input', '/concepts');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && (logs.textContent.includes('concept nodes') || 
                           logs.textContent.includes('Graph not initialized'));
        }, { timeout: 5000 });
    });

    test('/refresh command requests graph refresh', async () => {
        await page.type('#command-input', '/refresh');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Graph refresh requested');
        }, { timeout: 5000 });
    });

    test('/clear command clears logs', async () => {
        // First add some content to logs
        await page.type('#command-input', '<test --> command>.');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('<test --> command>.');
        }, { timeout: 5000 });
        
        // Now clear the logs
        await page.type('#command-input', '/clear');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Cleared logs');
        }, { timeout: 5000 });
    });

    test('Unknown debug command shows error', async () => {
        await page.type('#command-input', '/invalidcommand');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Unknown debug command:');
        }, { timeout: 5000 });
    });

    test('Case insensitive command handling', async () => {
        await page.type('#command-input', '/HELP');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Available debug commands:');
        }, { timeout: 5000 });
        
        await page.type('#command-input', '/State');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Connection:');
        }, { timeout: 5000 });
    });

    test('Command history includes debug commands', async () => {
        await page.type('#command-input', '/help');
        await page.click('#send-button');
        
        await page.type('#command-input', '/state');
        await page.click('#send-button');
        
        // Check history
        await page.click('#show-history');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('/help') && logs.textContent.includes('/state');
        }, { timeout: 5000 });
    });
});