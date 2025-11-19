/**
 * @file test-e2e.js
 * @description End-to-end tests for ui2 UI features using Puppeteer
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

// End-to-end tests for UI2
describe('ui2 End-to-End Tests', () => {
    let browser = null;
    let page = null;
    let serverProcess = null;
    let mockBackendProcess = null;

    const uiPort = 8094;
    const wsPort = 8095;

    beforeAll(async () => {
        // Start a mock backend server to simulate the NARS backend
        mockBackendProcess = spawn('node', ['-e', `
            import { WebSocketServer } from 'ws';
            
            const wss = new WebSocketServer({ port: ${wsPort} });
            
            console.log('Mock backend server listening on ws://localhost:${wsPort}');
            
            wss.on('connection', (ws) => {
                console.log('Mock backend: client connected');
                
                ws.on('message', (message) => {
                    console.log('Mock backend: received:', message.toString());
                    const parsed = JSON.parse(message.toString());
                    
                    // Respond to different message types like a real backend would
                    let response;
                    switch (parsed.type) {
                        case 'narseseInput':
                            response = {
                                type: 'narsese.result',
                                payload: { result: '✅ Processed: ' + parsed.payload.input }
                            };
                            break;
                        case 'requestNAR':
                            response = {
                                type: 'narInstance',
                                payload: { cycleCount: 100, isRunning: true }
                            };
                            break;
                        default:
                            response = {
                                type: 'info',
                                payload: { message: 'Received: ' + parsed.type }
                            };
                    }
                    
                    ws.send(JSON.stringify(response));
                });
                
                // Send periodic updates like a real backend might
                const interval = setInterval(() => {
                    ws.send(JSON.stringify({
                        type: 'info',
                        payload: { message: 'Periodic update ' + Date.now() }
                    }));
                }, 5000);
                
                ws.on('close', () => {
                    clearInterval(interval);
                    console.log('Mock backend: client disconnected');
                });
            });
        `], {
            stdio: 'pipe',
            shell: true
        });

        // Wait for mock backend to start
        await setTimeout(2000);

        // Start the UI2 server
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
        // Launch browser for each test
        browser = await puppeteer.launch({
            headless: true, // Set to false if you want to see the browser
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security'
            ]
        });
        
        page = await browser.newPage();
        
        // Navigate to the UI
        await page.goto(`http://localhost:${uiPort}`, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        // Wait for WebSocket connection to be established
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

    test('UI loads and connects to WebSocket', async () => {
        // Verify the UI loaded properly
        const title = await page.title();
        expect(title).toBe('SeNARS UI2');
        
        // Verify connection status shows as connected
        const connectionStatus = await page.$eval('#connection-status', el => el.textContent);
        expect(connectionStatus.toLowerCase()).toContain('connected');
        
        // Verify status indicator has the correct class
        const statusClass = await page.$eval('#status-indicator', el => el.className);
        expect(statusClass).toContain('status-connected');
    });

    test('Command input functionality', async () => {
        // Test entering and sending a command
        await page.type('#command-input', '<bird --> flyer>.');
        await page.click('#send-button');
        
        // Check that the command appears in the logs
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('<bird --> flyer>.');
        }, { timeout: 5000 });
        
        // Verify the command was sent by checking for the input marker
        const logsContent = await page.$eval('#logs-container', el => el.textContent);
        expect(logsContent).toContain('> <bird --> flyer>.');
    });

    test('Quick commands functionality', async () => {
        // Select a quick command from the dropdown
        await page.select('#quick-commands', '<cat --> animal> .');
        await page.click('#exec-quick');
        
        // Verify the quick command was executed
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('<cat --> animal>');
        }, { timeout: 5000 });
    });

    test('Debug commands work', async () => {
        // Test the /help command
        await page.type('#command-input', '/help');
        await page.click('#send-button');
        
        // Verify help text appears in logs
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Available debug commands:');
        }, { timeout: 5000 });
        
        // Test /state command
        await page.type('#command-input', '/state');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Connection:');
        }, { timeout: 5000 });
    });

    test('Graph controls functionality', async () => {
        // Test refresh graph button
        const initialCount = await page.$eval('#message-count', el => parseInt(el.textContent));
        
        await page.click('#refresh-graph');
        
        // Check that a message was sent
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Graph refresh requested');
        }, { timeout: 5000 });
    });

    test('Demo functionality', async () => {
        // Select and run a demo
        await page.select('#demo-select', 'inheritance');
        await page.click('#run-demo');
        
        // Check that demo commands start appearing in logs
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Running inheritance demo');
        }, { timeout: 5000 });
    });

    test('Clear logs functionality', async () => {
        // Add some content to logs first
        await page.type('#command-input', '<test --> command>.');
        await page.click('#send-button');
        
        // Wait for the log to appear
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('> <test --> command>.');
        }, { timeout: 5000 });
        
        // Then clear the logs
        await page.click('#clear-logs');
        
        // Check for the clear message
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Cleared logs');
        }, { timeout: 5000 });
    });

    test('History functionality', async () => {
        // Execute a few commands first
        await page.type('#command-input', '<first --> command>.');
        await page.click('#send-button');
        await setTimeout(500);
        
        await page.type('#command-input', '<second --> command>.');
        await page.click('#send-button');
        await setTimeout(500);
        
        // Click history button
        await page.click('#show-history');
        
        // Verify history appears in logs
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Command History');
        }, { timeout: 5000 });
    });
});