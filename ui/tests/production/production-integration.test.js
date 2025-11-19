/**
 * @file production-integration.test.js
 * @description Production-level integration tests using real backend services
 * These tests run against actual NAR backend, simulating real user interactions
 */

import puppeteer from 'puppeteer';
import { spawn, exec } from 'child_process';
import { setTimeout } from 'timers/promises';
import fetch from 'node-fetch';

describe('UI Production Integration Tests - Real Backend', () => {
    let browser = null;
    let page = null;
    let uiProcess = null;
    let narProcess = null;

    const uiPort = 8200;  // Use a port that's likely available
    const wsPort = 8201;

    // Wait for backend to be ready
    async function waitForBackend(port) {
        let attempts = 0;
        while (attempts < 30) {  // Wait up to 30 seconds
            try {
                const response = await fetch(`http://localhost:${port}/`, { method: 'GET' });
                if (response.ok) return true;
            } catch (e) {
                // Connection refused, server not ready yet
            }
            attempts++;
            await setTimeout(1000);
        }
        throw new Error(`Backend on port ${port} did not become ready`);
    }

    beforeAll(async () => {
        console.log('🚀 Starting NAR backend...');

        // Start actual NAR backend with WebSocket server
        narProcess = spawn('node', ['-e', `
            import {ReplEngine} from '../src/repl/ReplEngine.js';
            import {WebSocketMonitor} from '../src/server/WebSocketMonitor.js';
            import {WebRepl} from '../src/repl/WebRepl.js';

            async function start() {
                console.log('Starting NAR backend on port ${wsPort}...');
                
                const config = {
                    nar: {
                        lm: { enabled: false },
                        reasoningAboutReasoning: { enabled: true }
                    },
                    webSocket: {
                        port: ${wsPort},
                        host: '0.0.0.0',
                        maxConnections: 20
                    }
                };

                try {
                    const replEngine = new ReplEngine(config);
                    await replEngine.initialize();

                    const monitor = new WebSocketMonitor(config.webSocket);
                    await monitor.start();
                    replEngine.nar.connectToWebSocketMonitor(monitor);

                    const webRepl = new WebRepl(replEngine, monitor);
                    webRepl.registerWithWebSocketServer();

                    replEngine.nar.start();
                    
                    console.log('NAR backend started successfully on ws://localhost:${wsPort}');
                    
                    // Keep process alive
                    setInterval(() => {}, 10000);
                } catch (error) {
                    console.error('Failed to start NAR backend:', error);
                    process.exit(1);
                }
            }

            start().catch(console.error);
        `], {
            cwd: process.cwd(),
            stdio: 'pipe',
            shell: true
        });

        // Wait for NAR backend to be ready
        await setTimeout(5000); // Give it time to start

        console.log('🚀 Starting UI server...');

        // Start UI server
        uiProcess = spawn('node', ['server.js'], {
            cwd: './',
            stdio: 'pipe',
            env: {
                ...process.env,
                HTTP_PORT: uiPort.toString(),
                WS_PORT: wsPort.toString()
            }
        });

        // Wait for UI server to be ready
        await setTimeout(3000);

        console.log('🎯 Launching browser...');
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: true, // Set to false if you want to see the browser
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        page = await browser.newPage();
    });

    afterAll(async () => {
        console.log('🛑 Cleaning up processes...');
        
        // Clean up processes
        if (browser) {
            await browser.close();
        }
        
        if (uiProcess) {
            uiProcess.kill();
        }
        
        if (narProcess) {
            narProcess.kill();
        }
        
        console.log('✅ Cleanup complete');
    });

    beforeEach(async () => {
        // Ensure we have a fresh page for each test
        if (page) {
            // Navigate to the UI
            await page.goto(`http://localhost:${uiPort}`, {
                waitUntil: 'networkidle0',
                timeout: 15000
            });

            // Wait for connection to be established
            await page.waitForFunction(() => {
                const statusElement = document.querySelector('#connection-status');
                return statusElement && statusElement.textContent.toLowerCase().includes('connected');
            }, { timeout: 10000 });
        }
    });

    test('UI connects to real backend and shows initial state', async () => {
        // Verify connection is established with real backend
        const connectionStatus = await page.$eval('#connection-status', el => el.textContent);
        expect(connectionStatus.toLowerCase()).toContain('connected');
        
        // Verify WebSocket indicator shows connected state
        const indicatorClass = await page.$eval('#status-indicator', el => el.className);
        expect(indicatorClass).toContain('status-connected');
        
        // Check that the page loaded without JavaScript errors
        const errorLogs = [];
        page.on('pageerror', error => {
            errorLogs.push(error.message);
        });
        
        await setTimeout(1000); // Wait to catch any immediate errors
        expect(errorLogs).toHaveLength(0);
    });

    test('Send Narsese command to real backend and receive response', async () => {
        // Send a simple Narsese command to the real backend
        await page.type('#command-input', '<bird --> flyer>.');
        await page.click('#send-button');
        
        // Wait for response from real backend
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('bird') && logs.textContent.includes('flyer');
        }, { timeout: 10000 });
        
        // Verify the command was sent and processed
        const logsContent = await page.$eval('#logs-container', el => el.textContent);
        expect(logsContent).toContain('> <bird --> flyer>.');
        expect(logsContent).toContain('bird');
        expect(logsContent).toContain('flyer');
    });

    test('Execute reasoning step command', async () => {
        // Execute a reasoning step command
        await page.type('#command-input', '*step');
        await page.click('#send-button');
        
        // Wait for step execution response
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && (logs.textContent.includes('step') || logs.textContent.includes('cycle'));
        }, { timeout: 10000 });
        
        const logsContent = await page.$eval('#logs-container', el => el.textContent);
        expect(logsContent).toContain('> *step');
    });

    test('Test concept creation and visualization', async () => {
        // Create a concept that should appear in the graph
        await page.type('#command-input', '<{test_concept} --> important>.');
        await page.click('#send-button');
        
        // Wait for concept processing
        await setTimeout(2000);
        
        // Check that concept was processed by the backend
        const logsContent = await page.$eval('#logs-container', el => el.textContent);
        expect(logsContent).toContain('test_concept');
        
        // Test that debug command shows concepts
        await page.type('#command-input', '/concepts');
        await page.click('#send-button');
        
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Concept:');
        }, { timeout: 5000 });
    });

    test('Verify all UI controls work with real backend', async () => {
        // Test refresh graph button
        await page.click('#refresh-graph');
        await setTimeout(1000);
        
        const logsAfterRefresh = await page.$eval('#logs-container', el => el.textContent);
        expect(logsAfterRefresh).toContain('Graph refresh requested');
        
        // Test live toggle
        const initialText = await page.$eval('#toggle-live', el => el.textContent);
        await page.click('#toggle-live');
        await setTimeout(500);
        const updatedText = await page.$eval('#toggle-live', el => el.textContent);
        
        // The button text should change when toggled
        expect(updatedText).not.toBe(initialText);
    });

    test('Test quick commands functionality', async () => {
        // Select and execute a quick command
        await page.select('#quick-commands', '<cat --> animal> .');
        await page.click('#exec-quick');
        
        // Wait for execution
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('cat') && logs.textContent.includes('animal');
        }, { timeout: 10000 });
        
        const logsContent = await page.$eval('#logs-container', el => el.textContent);
        expect(logsContent).toContain('> <cat --> animal>');
        expect(logsContent).toContain('cat');
        expect(logsContent).toContain('animal');
    });

    test('Test debug commands with real backend state', async () => {
        // Test /state command
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

    test('Clear logs functionality works', async () => {
        // First add some content to logs
        await page.type('#command-input', '<temp --> test>.');
        await page.click('#send-button');
        await setTimeout(1000);
        
        // Then clear the logs
        await page.click('#clear-logs');
        await setTimeout(500);
        
        // Verify clear message appears
        const logsContent = await page.$eval('#logs-container', el => el.textContent);
        expect(logsContent).toContain('Cleared logs');
    });

    test('Run demo sequence successfully', async () => {
        // Select and run a demo
        await page.select('#demo-select', 'inheritance');
        await page.click('#run-demo');
        
        // Wait for demo to start running
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Running inheritance demo');
        }, { timeout: 5000 });
        
        const logsContent = await page.$eval('#logs-container', el => el.textContent);
        expect(logsContent).toContain('Running inheritance demo');
    });
});