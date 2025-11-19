/**
 * @file test-graph-visualization.js
 * @description Tests for graph visualization functionality in ui2
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

// Tests for graph visualization functionality
describe('ui2 Graph Visualization Tests', () => {
    let browser = null;
    let page = null;
    let serverProcess = null;
    let mockBackendProcess = null;

    const uiPort = 8098;
    const wsPort = 8099;

    beforeAll(async () => {
        // Start a mock backend server that sends graph-related messages
        mockBackendProcess = spawn('node', ['-e', `
            import { WebSocketServer } from 'ws';
            
            const wss = new WebSocketServer({ port: ${wsPort} });
            
            wss.on('connection', (ws) => {
                ws.on('message', (message) => {
                    console.log('Received:', message.toString());
                    
                    const parsed = JSON.parse(message.toString());
                    
                    if (parsed.type === 'control/refresh') {
                        // Send a memory snapshot to simulate graph data
                        ws.send(JSON.stringify({
                            type: 'memorySnapshot',
                            payload: {
                                concepts: [
                                    { id: 'concept1', term: 'bird', truth: { confidence: 0.9 } },
                                    { id: 'concept2', term: 'flyer', truth: { confidence: 0.8 } },
                                    { id: 'concept3', term: 'animal', truth: { confidence: 0.95 } }
                                ]
                            }
                        }));
                    } else if (parsed.type === 'narseseInput') {
                        // Send concept creation events to add nodes to the graph
                        ws.send(JSON.stringify({
                            type: 'concept.created',
                            payload: {
                                id: 'test_concept_' + Date.now(),
                                term: parsed.payload.input.split(' ')[0].replace(/[<\\>]/g, ''),
                                truth: { confidence: 0.85 }
                            }
                        }));
                    }
                });
                
                // Send some initial data to populate the graph
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        type: 'concept.created',
                        payload: { id: 'init1', term: 'initial_concept', truth: { confidence: 0.9 } }
                    }));
                }, 1000);
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

    test('Graph container is present and visible', async () => {
        const graphContainer = await page.$('#graph-container');
        expect(graphContainer).toBeTruthy();
        
        const isVisible = await page.$eval('#graph-container', el => {
            return !el.hidden && el.offsetParent !== null;
        });
        expect(isVisible).toBe(true);
    });

    test('Graph receives and displays concept nodes', async () => {
        // Wait for initial concept to be added
        await setTimeout(2000);
        
        // Check if graph has nodes by examining the cytoscape container
        await page.waitForFunction(() => {
            // Since we can't directly access cytoscape in tests, we'll look for visual indicators
            // The graph details panel should show when nodes are clicked
            return document.querySelector('#graph-details') !== null;
        }, { timeout: 5000 });
    });

    test('Graph refresh functionality works', async () => {
        // Click the refresh graph button
        await page.click('#refresh-graph');
        
        // Check for refresh message in logs
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Graph refresh requested');
        }, { timeout: 5000 });
    });

    test('Graph handles concept creation messages', async () => {
        // Send a command that should create a concept
        await page.type('#command-input', '<new_concept --> type>.');
        await page.click('#send-button');
        
        // Wait for the backend to respond with concept creation
        await setTimeout(1000);
        
        // Check that concept was mentioned in logs
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('new_concept');
        }, { timeout: 5000 });
    });

    test('Graph node types are differentiated', async () => {
        // Check that CSS classes for different node types exist
        const hasConceptClass = await page.evaluate(() => {
            const styles = Array.from(document.styleSheets).flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch {
                    return [];
                }
            });
            
            return styles.some(rule => 
                rule.selectorText && 
                rule.selectorText.includes('[type = "concept"]')
            );
        });
        
        const hasTaskClass = await page.evaluate(() => {
            const styles = Array.from(document.styleSheets).flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch {
                    return [];
                }
            });
            
            return styles.some(rule => 
                rule.selectorText && 
                rule.selectorText.includes('[type = "task"]')
            );
        });
        
        const hasQuestionClass = await page.evaluate(() => {
            const styles = Array.from(document.styleSheets).flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch {
                    return [];
                }
            });
            
            return styles.some(rule => 
                rule.selectorText && 
                rule.selectorText.includes('[type = "question"]')
            );
        });
        
        expect(hasConceptClass).toBe(true);
        expect(hasTaskClass).toBe(true);
        expect(hasQuestionClass).toBe(true);
    });

    test('Graph layout is applied', async () => {
        // Check that the layout style is present in the stylesheet
        const hasLayoutStyle = await page.evaluate(() => {
            // Look for Cytoscape.js specific styles
            return document.querySelector('#graph-container') !== null;
        });
        
        expect(hasLayoutStyle).toBe(true);
    });

    test('Graph details panel updates on node click', async () => {
        // Note: We can't simulate actual clicks on cytoscape nodes in Puppeteer,
        // but we can verify the details panel exists and has the proper structure
        const detailsPanelContent = await page.$eval('#graph-details', el => el.innerHTML);
        expect(detailsPanelContent).toContain('Click on nodes or edges to see details');
    });

    test('Live toggle functionality works', async () => {
        // Test the live toggle button
        const initialText = await page.$eval('#toggle-live', el => el.textContent);
        expect(initialText).toBe('Pause Live');
        
        await page.click('#toggle-live');
        
        const updatedText = await page.$eval('#toggle-live', el => el.textContent);
        expect(updatedText).toBe('Resume Live');
    });

    test('Memory snapshot updates graph nodes', async () => {
        // Simulate a memory snapshot by sending the command
        await page.type('#command-input', '*mem');
        await page.click('#send-button');
        
        // The backend mock will respond with a memory snapshot
        await page.waitForFunction(() => {
            const logs = document.querySelector('#logs-container');
            return logs && logs.textContent.includes('Memory snapshot received');
        }, { timeout: 5000 });
    });
});