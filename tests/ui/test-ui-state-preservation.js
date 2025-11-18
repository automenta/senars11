/**
 * @file test-ui-state-preservation.js
 * @description Test UI state preservation across page refreshes
 * 
 * This test validates that the UI maintains state information across page refreshes,
 * which is critical for user experience and workflow continuity.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setTimeout } from 'timers/promises';
import puppeteer from 'puppeteer';
import { TestConfig } from './test-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class UIStatePreservationTest {
    constructor(config = TestConfig.serverConfigs.normal) {
        this.config = config;
        this.narProcess = null;
        this.uiProcess = null;
        this.browser = null;
        this.page = null;
        this.initialState = {
            replHistory: [],
            graphNodes: [],
            concepts: [],
            tasks: []
        };
        this.stateAfterRefresh = {
            replHistory: [],
            graphNodes: [],
            concepts: [],
            tasks: []
        };
        this.testResults = {
            setup: false,
            statePreservation: [],
            errors: []
        };
    }

    async startNARServer() {
        console.log(`🚀 Starting NAR server for state preservation test on port ${this.config.port}...`);

        // Create the backend server with state tracking
        this.narProcess = spawn('node', ['-e', `
            import {NAR} from '../src/nar/NAR.js';
            import {WebSocketMonitor} from '../src/server/WebSocketMonitor.js';

            async function startServer() {
                console.log('=== STATE PRESERVATION NAR BACKEND ===');

                // Create NAR with configuration for state tracking
                const nar = new NAR(${JSON.stringify(this.config.narOptions)});

                try {
                    await nar.initialize();
                    console.log('✅ NAR initialized for state preservation test');

                    // Create and start WebSocket monitor
                    const monitor = new WebSocketMonitor({
                        port: ${this.config.port},
                        host: 'localhost',
                        path: '/ws',
                        maxConnections: 10
                    });

                    await monitor.start();
                    console.log('✅ WebSocket monitor started');

                    // Connect NAR to monitor
                    nar.connectToWebSocketMonitor(monitor);
                    console.log('✅ NAR connected to WebSocket monitor');

                    // Setup monitoring for state tracking
                    nar.on('task.input', (data) => {
                        console.log('STATE_EVENT: task.input', {
                            term: data?.task?.term?.toString?.() || 'unknown',
                            id: data?.taskId || 'unknown'
                        });
                    });

                    nar.on('concept.added', (data) => {
                        console.log('STATE_EVENT: concept.added', {
                            term: data?.concept?.term?.toString?.() || 'unknown',
                            priority: data?.concept?.priority || 'unknown'
                        });
                    });

                    nar.on('concept.removed', (data) => {
                        console.log('STATE_EVENT: concept.removed', {
                            term: data?.concept?.term?.toString?.() || 'unknown'
                        });
                    });

                    console.log('=== STATE PRESERVATION NAR BACKEND READY ===');
                    console.log('Listening on ws://localhost:${this.config.port}/ws');

                } catch (error) {
                    console.error('❌ NAR initialization error:', error);
                    process.exit(1);
                }
            }

            startServer().catch(err => {
                console.error('❌ Critical error in NAR server:', err);
                process.exit(1);
            });
        `], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_NO_WARNINGS: '1' }
        });

        // Capture output to detect when server is ready
        let output = '';
        this.narProcess.stdout.on('data', (data) => {
            const str = data.toString();
            output += str;
            
            if (str.includes('STATE PRESERVATION NAR BACKEND READY') || str.includes('STATE_EVENT')) {
                console.log(`[NAR] ${str.trim()}`);
            }
        });

        this.narProcess.stderr.on('data', (data) => {
            const errorStr = data.toString();
            console.error(`[NAR-ERROR] ${errorStr.trim()}`);
            this.testResults.errors.push(`NAR Error: ${errorStr}`);
        });

        // Wait for the server to be ready
        const startTime = Date.now();
        while (!output.includes('STATE PRESERVATION NAR BACKEND READY')) {
            if (Date.now() - startTime > 15000) { // 15 second timeout
                throw new Error('NAR server failed to start within 15 seconds');
            }
            await setTimeout(100);
        }

        console.log('✅ State preservation NAR server is ready!');
        return true;
    }

    async startUIServer() {
        console.log(`🚀 Starting UI server on port ${this.config.uiPort}...`);

        // Start the UI server using vite
        this.uiProcess = spawn('npx', ['vite', 'dev', '--port', this.config.uiPort.toString(), '--host'], {
            cwd: join(__dirname, '..', 'ui'),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                VITE_WS_HOST: 'localhost',
                VITE_WS_PORT: this.config.port.toString(),
                VITE_WS_PATH: '/ws'
            }
        });

        // Capture UI server output
        let uiOutput = '';
        this.uiProcess.stdout.on('data', (data) => {
            const str = data.toString();
            uiOutput += str;
            if (str.includes(`http://localhost:${this.config.uiPort}`)) {
                console.log(`[UI] Server ready at: http://localhost:${this.config.uiPort}`);
            }
        });

        this.uiProcess.stderr.on('data', (data) => {
            const errorStr = data.toString();
            if (!errorStr.includes('ExperimentalWarning')) { // Filter experimental warnings
                console.error(`[UI-ERROR] ${errorStr.trim()}`);
                this.testResults.errors.push(`UI Error: ${errorStr}`);
            }
        });

        // Wait for UI server to be ready
        const startTime = Date.now();
        while (!uiOutput.includes(`http://localhost:${this.config.uiPort}`) &&
               !uiOutput.includes(`Local:   http://localhost:${this.config.uiPort}`)) {
            if (Date.now() - startTime > 20000) { // 20 second timeout
                throw new Error('UI server failed to start within 20 seconds');
            }
            await setTimeout(100);
        }

        console.log('✅ UI server is ready!');
        return true;
    }

    async startBrowser() {
        console.log('🚀 Launching browser for state preservation test...');

        this.browser = await puppeteer.launch({
            headless: false, // Keep visible to observe UI behavior
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-web-security'
            ]
        });

        this.page = await this.browser.newPage();

        // Set up comprehensive console logging
        this.page.on('console', msg => {
            const text = msg.text();
            if (text.includes('error') || text.includes('Error') || text.includes('ERROR') ||
                msg.type() === 'error' || msg.type() === 'warning') {
                console.log(`Browser ${msg.type()}: ${text}`);
                if (msg.type() === 'error') {
                    this.testResults.errors.push(`Browser Error: ${text}`);
                }
            }
        });

        // Set up page error logging
        this.page.on('pageerror', error => {
            console.error('Browser page error:', error.message);
            this.testResults.errors.push(`Page Error: ${error.message}`);
        });

        console.log('✅ Browser launched for state preservation testing');
    }

    async navigateAndConnect() {
        console.log(`🌐 Navigating to UI: http://localhost:${this.config.uiPort}`);

        await this.page.goto(`http://localhost:${this.config.uiPort}`, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        console.log('✅ UI loaded successfully');

        // Wait for WebSocket connection to be established
        await this.page.waitForFunction(() => {
            const statusBar = document.querySelector('#status-bar');
            return statusBar && (
                statusBar.textContent.toLowerCase().includes('connected') ||
                statusBar.classList.contains('status-connected') ||
                statusBar.textContent.includes('Connected')
            );
        }, { timeout: 20000 });

        console.log('✅ WebSocket connection established');
    }

    async captureInitialState() {
        console.log('\n🔍 Capturing initial UI state before refresh...');

        // Add some content to create state to preserve
        const initialInputs = [
            '<initial_state_test --> concept>.',
            '<preservation --> validation>.',
            '<refresh_test --> scenario>?',
        ];

        for (const input of initialInputs) {
            console.log(`   Adding to state: ${input}`);
            await this.page.type('#repl-input', input);
            await this.page.keyboard.press('Enter');
            await setTimeout(500);
        }

        // Wait for potential graph updates
        await setTimeout(1000);

        // Capture REPL history
        this.initialState.replHistory = await this.page.evaluate(() => {
            const replOutput = document.querySelector('#repl-output') || 
                             document.querySelector('.repl-output') ||
                             document.querySelector('[id*="output"]');
            return replOutput ? replOutput.textContent : '';
        });

        // Capture graph state if available
        this.initialState.graphNodes = await this.page.evaluate(() => {
            const cyContainer = document.querySelector('#cy-container');
            if (!cyContainer) return [];
            
            // Try to capture node information if the graph library exposes it
            // This might depend on how the graph is implemented
            try {
                // Look for graph elements
                const nodeElements = cyContainer.querySelectorAll('[class*="node"], [class*="edge"], .node, .edge');
                const nodes = [];
                
                nodeElements.forEach((element, index) => {
                    nodes.push({
                        id: element.id || `node_${index}`,
                        className: element.className,
                        textContent: element.textContent || element.getAttribute('data-label') || ''
                    });
                });
                
                return nodes;
            } catch (e) {
                // If direct access fails, return basic info
                return [{ 
                    containerExists: !!cyContainer, 
                    childCount: cyContainer.children.length,
                    hasSVG: !!cyContainer.querySelector('svg'),
                    hasCanvas: !!cyContainer.querySelector('canvas')
                }];
            }
        });

        // Capture any other state that might be preserved
        this.initialState.pageStorage = await this.page.evaluate(() => {
            // Capture localStorage, sessionStorage, or other client-side storage
            const localStorageData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                localStorageData[key] = localStorage.getItem(key);
            }

            const sessionStorageData = {};
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                sessionStorageData[key] = sessionStorage.getItem(key);
            }

            return {
                localStorage: localStorageData,
                sessionStorage: sessionStorageData,
                url: window.location.href,
                title: document.title
            };
        });

        console.log(`   Captured state:`);
        console.log(`     - REPL history length: ${this.initialState.replHistory.length}`);
        console.log(`     - Graph nodes: ${this.initialState.graphNodes.length}`);
        console.log(`     - Local storage items: ${Object.keys(this.initialState.pageStorage.localStorage).length}`);
        
        this.testResults.statePreservation.push({
            phase: 'initial_capture',
            replHistoryLength: this.initialState.replHistory.length,
            graphNodesCount: this.initialState.graphNodes.length,
            localStorageCount: Object.keys(this.initialState.pageStorage.localStorage).length,
            timestamp: Date.now()
        });
    }

    async refreshPageAndCaptureNewState() {
        console.log('\n🔄 Refreshing page and capturing new state...');

        // Refresh the page
        await this.page.reload({ waitUntil: 'networkidle0', timeout: 30000 });

        console.log('   Page refreshed, waiting for reconnection...');
        
        // Wait for WebSocket reconnection
        await this.page.waitForFunction(() => {
            const statusBar = document.querySelector('#status-bar');
            return statusBar && (
                statusBar.textContent.toLowerCase().includes('connected') ||
                statusBar.classList.contains('status-connected') ||
                statusBar.textContent.includes('Connected')
            );
        }, { timeout: 20000 });

        console.log('   ✅ Reconnection established');

        // Wait a bit for any state restoration to occur
        await setTimeout(2000);

        // Capture state after refresh
        this.stateAfterRefresh.replHistory = await this.page.evaluate(() => {
            const replOutput = document.querySelector('#repl-output') || 
                             document.querySelector('.repl-output') ||
                             document.querySelector('[id*="output"]');
            return replOutput ? replOutput.textContent : '';
        });

        this.stateAfterRefresh.graphNodes = await this.page.evaluate(() => {
            const cyContainer = document.querySelector('#cy-container');
            if (!cyContainer) return [];
            
            try {
                // Look for graph elements after refresh
                const nodeElements = cyContainer.querySelectorAll('[class*="node"], [class*="edge"], .node, .edge');
                const nodes = [];
                
                nodeElements.forEach((element, index) => {
                    nodes.push({
                        id: element.id || `node_${index}`,
                        className: element.className,
                        textContent: element.textContent || element.getAttribute('data-label') || ''
                    });
                });
                
                return nodes;
            } catch (e) {
                // If direct access fails, return basic info
                return [{ 
                    containerExists: !!cyContainer, 
                    childCount: cyContainer.children.length,
                    hasSVG: !!cyContainer.querySelector('svg'),
                    hasCanvas: !!cyContainer.querySelector('canvas')
                }];
            }
        });

        this.stateAfterRefresh.pageStorage = await this.page.evaluate(() => {
            const localStorageData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                localStorageData[key] = localStorage.getItem(key);
            }

            const sessionStorageData = {};
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                sessionStorageData[key] = sessionStorage.getItem(key);
            }

            return {
                localStorage: localStorageData,
                sessionStorage: sessionStorageData,
                url: window.location.href,
                title: document.title
            };
        });

        console.log(`   Captured state after refresh:`);
        console.log(`     - REPL history length: ${this.stateAfterRefresh.replHistory.length}`);
        console.log(`     - Graph nodes: ${this.stateAfterRefresh.graphNodes.length}`);
        console.log(`     - Local storage items: ${Object.keys(this.stateAfterRefresh.pageStorage.localStorage).length}`);

        this.testResults.statePreservation.push({
            phase: 'after_refresh',
            replHistoryLength: this.stateAfterRefresh.replHistory.length,
            graphNodesCount: this.stateAfterRefresh.graphNodes.length,
            localStorageCount: Object.keys(this.stateAfterRefresh.pageStorage.localStorage).length,
            timestamp: Date.now()
        });
    }

    async compareStates() {
        console.log('\n📊 Comparing states before and after refresh...');

        // Compare REPL history
        const replHistorySame = this.initialState.replHistory === this.stateAfterRefresh.replHistory;
        console.log(`   REPL History Preserved: ${replHistorySame ? '✅ YES' : '❌ NO'}`);

        // Compare graph nodes
        const graphNodesSame = JSON.stringify(this.initialState.graphNodes) === JSON.stringify(this.stateAfterRefresh.graphNodes);
        console.log(`   Graph Nodes Preserved: ${graphNodesSame ? '✅ YES' : graphNodesSame === false ? '❌ NO' : '⚠️  UNKNOWN'}`);

        // Compare local storage
        const localStorageSame = JSON.stringify(this.initialState.pageStorage.localStorage) === 
                                JSON.stringify(this.stateAfterRefresh.pageStorage.localStorage);
        console.log(`   Local Storage Preserved: ${localStorageSame ? '✅ YES' : '❌ NO'}`);

        // Detailed comparison for report
        this.testResults.statePreservation.push({
            phase: 'comparison',
            replHistoryPreserved: replHistorySame,
            graphNodesPreserved: graphNodesSame,
            localStoragePreserved: localStorageSame,
            initialReplLength: this.initialState.replHistory.length,
            afterRefreshReplLength: this.stateAfterRefresh.replHistory.length,
            initialGraphNodesCount: this.initialState.graphNodes.length,
            afterRefreshGraphNodesCount: this.stateAfterRefresh.graphNodes.length,
            timestamp: Date.now()
        });

        return {
            replHistoryPreserved: replHistorySame,
            graphNodesPreserved: graphNodesSame,
            localStoragePreserved: localStorageSame
        };
    }

    async testStatePersistenceWithInputs() {
        console.log('\n🔍 Testing state persistence with additional inputs after refresh...');

        // Add more inputs after refresh to see if state continues properly
        const postRefreshInputs = [
            '<post_refresh --> input>.',
            '<state_continuation --> validation>.',
        ];

        for (const input of postRefreshInputs) {
            console.log(`   Adding post-refresh input: ${input}`);
            await this.page.type('#repl-input', input);
            await this.page.keyboard.press('Enter');
            await setTimeout(500);
        }

        // Capture state again
        const finalReplHistory = await this.page.evaluate(() => {
            const replOutput = document.querySelector('#repl-output') || 
                             document.querySelector('.repl-output') ||
                             document.querySelector('[id*="output"]');
            return replOutput ? replOutput.textContent : '';
        });

        console.log(`   Final REPL history length: ${finalReplHistory.length}`);

        this.testResults.statePreservation.push({
            phase: 'post_refresh_inputs',
            finalReplHistoryLength: finalReplHistory.length,
            inputsAdded: postRefreshInputs.length,
            timestamp: Date.now()
        });
    }

    async runCompleteTest() {
        console.log('🚀 Starting UI state preservation across refreshes test...\n');

        try {
            // Start NAR server
            await this.startNARServer();

            // Start UI server
            await this.startUIServer();

            // Start browser for testing
            await this.startBrowser();

            // Navigate to UI and establish connection
            await this.navigateAndConnect();

            // Capture initial state
            await this.captureInitialState();

            // Refresh page and capture new state
            await this.refreshPageAndCaptureNewState();

            // Compare states
            const comparisonResult = await this.compareStates();

            // Test persistence with additional inputs
            await this.testStatePersistenceWithInputs();

            console.log('\n✅ UI state preservation test completed!');
            this.testResults.setup = true;
            return true;

        } catch (error) {
            console.error(`\n❌ State preservation test failed: ${error.message}`);
            console.error(error.stack);
            this.testResults.errors.push(`Critical Test Error: ${error.message}`);
            return false;
        }
    }

    async generateTestReport() {
        console.log('\n📋=== UI STATE PRESERVATION TEST REPORT ===');

        console.log(`\n🔧 Setup: ${this.testResults.setup ? '✅ PASS' : '❌ FAIL'}`);

        // Get the comparison results
        const comparison = this.testResults.statePreservation.find(r => r.phase === 'comparison');
        
        if (comparison) {
            console.log(`\n📊 State Preservation Results:`);
            console.log(`  REPL History: ${comparison.replHistoryPreserved ? '✅ PRESERVED' : '❌ LOST'}`);
            console.log(`  Graph Nodes: ${comparison.graphNodesPreserved ? '✅ PRESERVED' : comparison.graphNodesPreserved === false ? '❌ LOST' : '📊 NO DATA'}`);
            console.log(`  Local Storage: ${comparison.localStoragePreserved ? '✅ PRESERVED' : '❌ LOST'}`);
            
            console.log(`\n📈 Before Refresh:`);
            console.log(`  - REPL Length: ${comparison.initialReplLength}`);
            console.log(`  - Graph Nodes: ${comparison.initialGraphNodesCount}`);
            
            console.log(`\n📈 After Refresh:`);
            console.log(`  - REPL Length: ${comparison.afterRefreshReplLength}`);
            console.log(`  - Graph Nodes: ${comparison.afterRefreshGraphNodesCount}`);
        }

        console.log(`\n🔄 Test Operations: ${this.testResults.statePreservation.length} operations tracked`);
        const operationsByPhase = this.testResults.statePreservation.reduce((acc, op) => {
            acc[op.phase] = (acc[op.phase] || 0) + 1;
            return acc;
        }, {});
        
        Object.entries(operationsByPhase).forEach(([phase, count]) => {
            console.log(`  ${phase}: ${count} operations`);
        });

        if (this.testResults.errors.length > 0) {
            console.log(`\n❌ Errors Encountered: ${this.testResults.errors.length}`);
            this.testResults.errors.slice(0, 5).forEach(error => {
                console.log(`  • ${error}`);
            });
            if (this.testResults.errors.length > 5) {
                console.log(`  ... and ${this.testResults.errors.length - 5} more errors`);
            }
        }

        // Determine success based on whether critical state was preserved
        const stateLossDetected = comparison && (
            (!comparison.replHistoryPreserved && comparison.initialReplLength > 0) ||
            (!comparison.localStoragePreserved && Object.keys(this.initialState.pageStorage.localStorage).length > 0)
        );
        
        const overallSuccess = this.testResults.setup && !stateLossDetected && this.testResults.errors.length === 0;

        console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ STATE PRESERVATION WORKING' : '❌ STATE PRESERVATION ISSUE'}`);
        console.log(`\n💡 Note: Some UI elements may not preserve state by design, but critical data should persist.`);

        return overallSuccess;
    }

    async tearDown() {
        console.log('\n🛑 Shutting down state preservation test environment...');

        // Close browser
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (e) {
                console.warn('Warning closing browser:', e.message);
            }
        }

        // Kill UI process
        if (this.uiProcess) {
            try {
                this.uiProcess.kill();
            } catch (e) {
                console.warn('Warning killing UI process:', e.message);
            }
        }

        // Kill NAR process
        if (this.narProcess) {
            try {
                this.narProcess.kill();
            } catch (e) {
                console.warn('Warning killing NAR process:', e.message);
            }
        }

        console.log('✅ State preservation test environment cleaned up');
    }

    async run() {
        let success = false;

        try {
            success = await this.runCompleteTest();
        } finally {
            const reportSuccess = await this.generateTestReport();
            await this.tearDown();

            // Return the more comprehensive result
            const finalSuccess = success && reportSuccess;
            console.log(`\n🏁 Final Test Outcome: ${finalSuccess ? 'SUCCESS' : 'FAILURE'}`);

            return finalSuccess;
        }
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const testRunner = new UIStatePreservationTest();
    testRunner.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(console.error);
}

export { UIStatePreservationTest };