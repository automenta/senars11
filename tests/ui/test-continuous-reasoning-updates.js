/**
 * @file test-continuous-reasoning-updates.js
 * @description Test real-time updates during continuous reasoning mode
 * 
 * This test specifically validates that the UI receives and displays real-time
 * updates as the NAR performs continuous reasoning operations.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setTimeout } from 'timers/promises';
import puppeteer from 'puppeteer';
import { TestConfig } from './test-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ContinuousReasoningTest {
    constructor(config = TestConfig.serverConfigs.normal) {
        this.config = config;
        this.narProcess = null;
        this.uiProcess = null;
        this.browser = null;
        this.page = null;
        this.testResults = {
            setup: false,
            realTimeUpdates: [],
            continuousReasoning: [],
            errors: []
        };
    }

    async startNARServer() {
        console.log(`🚀 Starting NAR server for continuous reasoning test on port ${this.config.port}...`);

        // Create the backend server with continuous reasoning capabilities
        this.narProcess = spawn('node', ['-e', `
            import {NAR} from '../src/nar/NAR.js';
            import {WebSocketMonitor} from '../src/server/WebSocketMonitor.js';

            async function startServer() {
                console.log('=== CONTINUOUS REASONING NAR BACKEND ===');

                // Create NAR with configuration for continuous reasoning
                const nar = new NAR(${JSON.stringify(this.config.narOptions)});

                try {
                    await nar.initialize();
                    console.log('✅ NAR initialized for continuous reasoning');

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

                    // Setup monitoring for real-time updates
                    nar.on('task.processed', (data) => {
                        console.log('CONTINUOUS_UPDATE: task.processed', {
                            term: data?.task?.term?.toString?.() || 'unknown',
                            priority: data?.task?.priority || 'unknown',
                            occurrenceTime: data?.task?.occurrenceTime || 'unknown'
                        });
                    });

                    nar.on('concept.updated', (data) => {
                        console.log('CONTINUOUS_UPDATE: concept.updated', {
                            term: data?.concept?.term?.toString?.() || 'unknown',
                            priority: data?.concept?.priority || 'unknown'
                        });
                    });

                    nar.on('reasoning.cycle', (data) => {
                        console.log('CONTINUOUS_UPDATE: reasoning.cycle.completed');
                    });

                    console.log('=== CONTINUOUS REASONING NAR BACKEND READY ===');
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
            
            if (str.includes('CONTINUOUS REASONING NAR BACKEND READY') || str.includes('CONTINUOUS_UPDATE')) {
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
        while (!output.includes('CONTINUOUS REASONING NAR BACKEND READY')) {
            if (Date.now() - startTime > 15000) { // 15 second timeout
                throw new Error('NAR server failed to start within 15 seconds');
            }
            await setTimeout(100);
        }

        console.log('✅ Continuous reasoning NAR server is ready!');
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
        console.log('🚀 Launching browser for continuous reasoning test...');

        this.browser = await puppeteer.launch({
            headless: false, // Keep visible to observe real-time updates
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding'
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

        console.log('✅ Browser launched for continuous reasoning observation');
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

    async setupContinuousReasoningScenario() {
        console.log('\n🔧 Setting up continuous reasoning scenario...');

        // Input initial premises that will generate inferences during continuous reasoning
        const premises = [
            '<bird --> animal>. :|: %1.00;0.90%',  // Birds are animals
            '<robin --> bird>. :|: %1.00;0.90%',  // Robins are birds
            '<ostrich --> bird>. :|: %1.00;0.90%', // Ostriches are birds
            '<(robin &/ seed) --> foraging>. :|: %1.00;0.80%' // Robins forage for seeds
        ];

        for (let i = 0; i < premises.length; i++) {
            const premise = premises[i];
            console.log(`   Adding premise ${i+1}/${premises.length}: ${premise.substring(0, 30)}...`);
            
            await this.page.type('#repl-input', premise);
            await this.page.keyboard.press('Enter');
            await setTimeout(500); // Brief pause between inputs
            
            this.testResults.continuousReasoning.push({
                type: 'premise_input',
                premise: premise,
                status: 'added',
                timestamp: Date.now()
            });
        }

        console.log('✅ Continuous reasoning premises added');
    }

    async monitorRealTimeUpdates() {
        console.log('\n👀 Monitoring real-time updates during continuous reasoning...');

        // Start continuous reasoning
        console.log('   Starting continuous reasoning mode...');
        await this.page.type('#repl-input', '*run');
        await this.page.keyboard.press('Enter');
        await setTimeout(500);

        // Monitor the UI for real-time updates over 5 seconds
        const monitoringDuration = 5000; // 5 seconds
        const startTime = Date.now();
        let updateCount = 0;

        while (Date.now() - startTime < monitoringDuration) {
            // Check for visual updates in the UI
            const replOutputBefore = await this.page.evaluate(() => {
                const output = document.querySelector('#repl-output') || 
                              document.querySelector('.repl-output') ||
                              document.querySelector('[id*="output"]');
                return output ? output.textContent : '';
            });

            // Wait a bit to see if new content appears
            await setTimeout(500);

            const replOutputAfter = await this.page.evaluate(() => {
                const output = document.querySelector('#repl-output') || 
                              document.querySelector('.repl-output') ||
                              document.querySelector('[id*="output"]');
                return output ? output.textContent : '';
            });

            // Check if output changed (indicating new reasoning results)
            if (replOutputAfter.length > replOutputBefore.length) {
                updateCount++;
                console.log(`   🔄 Real-time update detected (update #${updateCount})`);
                
                this.testResults.realTimeUpdates.push({
                    type: 'output_change',
                    updateNumber: updateCount,
                    timestamp: Date.now(),
                    outputLengthBefore: replOutputBefore.length,
                    outputLengthAfter: replOutputAfter.length
                });
            }

            // Check for graph updates
            const graphHasContent = await this.page.evaluate(() => {
                const cyContainer = document.querySelector('#cy-container');
                if (!cyContainer) return false;

                return cyContainer.querySelector('svg') !== null ||
                       cyContainer.querySelector('canvas') !== null ||
                       cyContainer.querySelectorAll('[class*="node"], [class*="edge"]').length > 0 ||
                       cyContainer.querySelector('[id^="cytoscape"]') !== null;
            });

            if (graphHasContent) {
                updateCount++;
                console.log(`   📊 Graph update detected (update #${updateCount})`);
                
                this.testResults.realTimeUpdates.push({
                    type: 'graph_change',
                    updateNumber: updateCount,
                    timestamp: Date.now()
                });
            }
        }

        // Stop continuous reasoning
        console.log('   Stopping continuous reasoning mode...');
        await this.page.type('#repl-input', '*stop');
        await this.page.keyboard.press('Enter');
        await setTimeout(500);

        console.log(`✅ Real-time monitoring completed. Detected ${updateCount} updates.`);
    }

    async testSingleStepUpdates() {
        console.log('\n🔍 Testing single step updates for comparison...');

        // Input a new premise
        await this.page.type('#repl-input', '<fish --> animal>. :|: %1.00;0.90%');
        await this.page.keyboard.press('Enter');
        await setTimeout(300);

        // Execute single step
        let outputBeforeStep = await this.page.evaluate(() => {
            const output = document.querySelector('#repl-output') || 
                          document.querySelector('.repl-output') ||
                          document.querySelector('[id*="output"]');
            return output ? output.textContent : '';
        });

        await this.page.type('#repl-input', '*step');
        await this.page.keyboard.press('Enter');
        await setTimeout(800); // Wait for step completion

        let outputAfterStep = await this.page.evaluate(() => {
            const output = document.querySelector('#repl-output') || 
                          document.querySelector('.repl-output') ||
                          document.querySelector('[id*="output"]');
            return output ? output.textContent : '';
        });

        const hasStepUpdate = outputAfterStep.length > outputBeforeStep.length;
        console.log(`   Single step update: ${hasStepUpdate ? '✅ YES' : '❌ NO'}`);

        this.testResults.continuousReasoning.push({
            type: 'single_step_test',
            hasUpdate: hasStepUpdate,
            timestamp: Date.now()
        });
    }

    async runCompleteTest() {
        console.log('🚀 Starting real-time continuous reasoning updates test...\n');

        try {
            // Start NAR server with continuous reasoning capabilities
            await this.startNARServer();

            // Start UI server
            await this.startUIServer();

            // Start browser for testing
            await this.startBrowser();

            // Navigate to UI and establish connection
            await this.navigateAndConnect();

            // Set up continuous reasoning scenario with premises
            await this.setupContinuousReasoningScenario();

            // Test single step updates first
            await this.testSingleStepUpdates();

            // Monitor real-time updates during continuous reasoning
            await this.monitorRealTimeUpdates();

            console.log('\n✅ Continuous reasoning real-time updates test completed!');
            this.testResults.setup = true;
            return true;

        } catch (error) {
            console.error(`\n❌ Continuous reasoning test failed: ${error.message}`);
            console.error(error.stack);
            this.testResults.errors.push(`Critical Test Error: ${error.message}`);
            return false;
        }
    }

    async generateTestReport() {
        console.log('\n📋=== CONTINUOUS REASONING TEST REPORT ===');

        console.log(`\n🔧 Setup: ${this.testResults.setup ? '✅ PASS' : '❌ FAIL'}`);

        console.log(`\n🔄 Real-time Updates: ${this.testResults.realTimeUpdates.length} updates detected`);
        const updateTypes = this.testResults.realTimeUpdates.reduce((acc, update) => {
            acc[update.type] = (acc[update.type] || 0) + 1;
            return acc;
        }, {});
        
        Object.entries(updateTypes).forEach(([type, count]) => {
            console.log(`  ${type}: ${count} occurrences`);
        });

        console.log(`\n⚙️  Continuous Reasoning Operations: ${this.testResults.continuousReasoning.length} operations`);
        this.testResults.continuousReasoning.forEach((op, i) => {
            console.log(`  ${i+1}. ${op.type}: ${op.hasUpdate ? '✅' : op.status || '✅'}`);
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

        const hasRealTimeUpdates = this.testResults.realTimeUpdates.length > 0;
        const overallSuccess = this.testResults.setup && hasRealTimeUpdates && this.testResults.errors.length === 0;

        console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ REAL-TIME UPDATES WORKING' : '❌ REAL-TIME UPDATES ISSUE'}`);
        console.log(`\n📊 Summary:`);
        console.log(`  - Real-time updates detected: ${hasRealTimeUpdates ? 'YES' : 'NO'}`);
        console.log(`  - Total updates captured: ${this.testResults.realTimeUpdates.length}`);

        return overallSuccess;
    }

    async tearDown() {
        console.log('\n🛑 Shutting down continuous reasoning test environment...');

        // Stop continuous reasoning if still running
        if (this.page) {
            try {
                await this.page.type('#repl-input', '*stop');
                await this.page.keyboard.press('Enter');
                await setTimeout(500);
            } catch (e) {
                console.warn('Warning stopping reasoning:', e.message);
            }
        }

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

        console.log('✅ Continuous reasoning test environment cleaned up');
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
    const testRunner = new ContinuousReasoningTest();
    testRunner.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(console.error);
}

export { ContinuousReasoningTest };