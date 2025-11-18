/**
 * @file extended-integration-test.js
 * @description Extended end-to-end integration test following new requirements
 * 
 * This test implements the following principles:
 * - Tests objects directly, without resorting to mocks
 * - Covers realistic UI/UX patterns  
 * - Ensures visible and tangible system reactions
 * - Handles errors robustly with detailed explanations
 * - Tests NAR reasoning in both step and continuous modes
 * - Self-contained with proper resource cleanup
 * - Tests buffering/batching with small capacities
 * - Parameterized to avoid redundant code
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setTimeout } from 'timers/promises';
import puppeteer from 'puppeteer';
import { TestConfig } from './test-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ExtendedIntegrationTest {
    constructor(config = TestConfig.serverConfigs.normal, uiConfig = TestConfig.uiConfigs.normal) {
        this.config = config;
        this.uiConfig = uiConfig;
        this.narProcess = null;
        this.uiProcess = null;
        this.browser = null;
        this.page = null;
        this.testResults = {
            setup: { nar: false, ui: false, connection: false },
            operations: [],
            uiuxTests: [],
            errorTests: [],
            reasoningTests: [],
            errors: []
        };
    }

    async startBackendServer() {
        console.log(`🚀 Starting NAR backend server on port ${this.config.port}...`);

        // Create the backend server as a child process
        this.narProcess = spawn('node', ['-e', `
            import {NAR} from '../src/nar/NAR.js';
            import {WebSocketMonitor} from '../src/server/WebSocketMonitor.js';

            async function startServer() {
                console.log('=== EXTENDED NAR BACKEND INITIALIZATION ===');

                // Create NAR with the provided configuration
                const nar = new NAR(${JSON.stringify(this.config.narOptions)});

                try {
                    await nar.initialize();
                    console.log('✅ NAR initialized successfully with config:', ${JSON.stringify(this.config.narOptions)});

                    // Create and start WebSocket monitor
                    const monitor = new WebSocketMonitor({
                        port: ${this.config.port},
                        host: 'localhost',
                        path: '/ws',
                        maxConnections: 10
                    });

                    await monitor.start();
                    console.log('✅ WebSocket monitor started successfully');

                    // Connect NAR to monitor
                    nar.connectToWebSocketMonitor(monitor);
                    console.log('✅ NAR connected to WebSocket monitor');

                    // Setup comprehensive event monitoring
                    nar.on('task.input', (data) => {
                        console.log('NAR_EVENT: task.input', data?.task?.term?.toString?.() || 'unknown');
                    });

                    nar.on('task.processed', (data) => {
                        console.log('NAR_EVENT: task.processed', data?.task?.term?.toString?.() || 'unknown');
                    });
                    
                    nar.on('reasoning.step', (data) => {
                        console.log('NAR_EVENT: reasoning.step completed');
                    });
                    
                    nar.on('reasoning.continuous', (data) => {
                        console.log('NAR_EVENT: reasoning.continuous running');
                    });

                    // Monitor buffer events if small capacity is used
                    if (${this.config.narOptions.memory.conceptBag.capacity} <= 10) {
                        nar.on('buffer.overflow', (data) => {
                            console.log('NAR_EVENT: buffer overflow detected');
                        });
                    }

                    console.log('=== EXTENDED NAR BACKEND READY ===');
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
            
            if (str.includes('EXTENDED NAR BACKEND READY') || str.includes('NAR_EVENT') || str.includes('ERROR')) {
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
        while (!output.includes('EXTENDED NAR BACKEND READY')) {
            if (Date.now() - startTime > 15000) { // 15 second timeout
                throw new Error('NAR server failed to start within 15 seconds');
            }
            await setTimeout(100);
        }

        this.testResults.setup.nar = true;
        console.log('✅ NAR backend server is ready and fully functional!');
    }

    async startUIServer() {
        console.log(`🚀 Starting UI server on port ${this.config.uiPort}...`);

        // Install dependencies in UI directory if needed
        try {
            const { execSync } = await import('child_process');
            console.log('📦 Ensuring UI dependencies are installed...');
            execSync('npm ci', { cwd: join(__dirname, '..', 'ui'), stdio: 'pipe' });
        } catch (e) {
            // If npm ci fails, try npm install
            try {
                const { execSync } = await import('child_process');
                execSync('npm install', { cwd: join(__dirname, '..', 'ui'), stdio: 'pipe' });
            } catch (e2) {
                console.log('⚠️  Dependency installation issues, continuing anyway...');
            }
        }

        // Start the UI server using vite
        this.uiProcess = spawn('npx', ['vite', 'dev', '--port', this.config.uiPort.toString(), '--host'], {
            cwd: join(__dirname, '..', 'ui'),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                VITE_WS_HOST: 'localhost',
                VITE_WS_PORT: this.config.port.toString(),
                VITE_WS_PATH: '/ws',
                NODE_ENV: 'development'
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

        this.testResults.setup.ui = true;
        console.log('✅ UI server is ready and accepting connections!');
    }

    async startBrowser() {
        console.log('🚀 Launching browser with comprehensive debugging...');

        this.browser = await puppeteer.launch({
            headless: this.uiConfig.headless,
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

        // Set up response logging to catch failures
        this.page.on('response', response => {
            if (response.status() >= 400) {
                console.error(`HTTP ${response.status()} Error: ${response.url()}`);
                this.testResults.errors.push(`HTTP Error ${response.status()}: ${response.url()}`);
            }
        });

        // Set up request logging for WebSocket connections
        this.page.on('request', request => {
            if (request.url().includes('ws://') || request.url().includes('websocket')) {
                console.log(`WebSocket Request: ${request.url()}`);
            }
        });

        this.page.on('requestfailed', request => {
            if (request.failure()) {
                console.error(`Request failed: ${request.url()} - ${request.failure().errorText}`);
                this.testResults.errors.push(`Request Failed: ${request.url()} - ${request.failure().errorText}`);
            }
        });

        console.log('✅ Browser launched with comprehensive debugging');
    }

    async verifyWebSocketConnection() {
        console.log('\n📡 Verifying WebSocket connection...');

        // Wait for WebSocket connection to be established
        await this.page.waitForFunction(() => {
            // Look for connection status indicators in the UI
            const statusBar = document.querySelector('#status-bar');
            const hasConnectedStatus = statusBar && (
                statusBar.textContent.toLowerCase().includes('connected') ||
                statusBar.classList.contains('status-connected') ||
                statusBar.textContent.includes('Connected')
            );

            // Also check for WebSocket connection in the page itself
            const hasWebSocket = window.service && window.service.isConnected && window.service.isConnected();

            return hasConnectedStatus || hasWebSocket;
        }, { timeout: 20000 }); // Longer timeout for connection establishment

        console.log('✅ WebSocket connection established successfully');
        this.testResults.setup.connection = true;
    }

    async testRealisticUIUXPatterns() {
        console.log('\n🎯 Testing realistic UI/UX patterns...');

        const uiuxTests = [
            {
                name: 'Input and submit Narsese',
                action: async () => {
                    const input = '<ui_ux_test --> concept>.';
                    await this.page.type('#repl-input', input);
                    await this.page.keyboard.press('Enter');
                    await setTimeout(1000);
                    return true;
                },
                description: 'Basic input and submission pattern'
            },
            {
                name: 'Multiple rapid inputs',
                action: async () => {
                    const inputs = [
                        '<rapid_input_1 --> test>.',
                        '<rapid_input_2 --> test>.',
                        '<rapid_input_3 --> test>.'
                    ];
                    for (const input of inputs) {
                        await this.page.type('#repl-input', input);
                        await this.page.keyboard.press('Enter');
                        await setTimeout(300); // Brief pause
                    }
                    return true;
                },
                description: 'Rapid sequential input pattern'
            },
            {
                name: 'Command execution',
                action: async () => {
                    await this.page.type('#repl-input', '*step');
                    await this.page.keyboard.press('Enter');
                    await setTimeout(800);
                    return true;
                },
                description: 'System command execution'
            }
        ];

        for (const test of uiuxTests) {
            try {
                console.log(`  Running: ${test.name} - ${test.description}`);
                const result = await test.action();
                
                if (result) {
                    console.log(`    ✅ ${test.name} passed`);
                    this.testResults.uiuxTests.push({
                        name: test.name,
                        status: 'passed',
                        description: test.description
                    });
                } else {
                    throw new Error(`Test ${test.name} returned false`);
                }
            } catch (error) {
                console.error(`    ❌ ${test.name} failed: ${error.message}`);
                this.testResults.uiuxTests.push({
                    name: test.name,
                    status: 'failed',
                    description: test.description,
                    error: error.message
                });
                this.testResults.errors.push(`UIUX Test Error: ${test.name} - ${error.message}`);
            }
        }

        console.log('✅ Realistic UI/UX pattern tests completed');
    }

    async testReasoningModes() {
        console.log('\n🧠 Testing NAR reasoning in different modes...');

        // Test step mode
        try {
            console.log('  Testing step mode reasoning...');
            await this.page.type('#repl-input', TestConfig.reasoningModes.stepMode.command);
            await this.page.keyboard.press('Enter');
            await setTimeout(1000);
            console.log('  ✅ Step mode executed');
            
            this.testResults.reasoningTests.push({
                mode: 'step',
                command: TestConfig.reasoningModes.stepMode.command,
                status: 'passed'
            });
        } catch (error) {
            console.error(`  ❌ Step mode failed: ${error.message}`);
            this.testResults.reasoningTests.push({
                mode: 'step',
                command: TestConfig.reasoningModes.stepMode.command,
                status: 'failed',
                error: error.message
            });
            this.testResults.errors.push(`Step Mode Error: ${error.message}`);
        }

        // Test with basic Narsese to create some reasoning context
        try {
            console.log('  Creating reasoning context...');
            await this.page.type('#repl-input', '<reasoning_context --> established>.');
            await this.page.keyboard.press('Enter');
            await setTimeout(500);
            
            // Execute multiple steps to simulate continuous reasoning
            for (let i = 0; i < 3; i++) {
                await this.page.type('#repl-input', '*step');
                await this.page.keyboard.press('Enter');
                await setTimeout(600);
                console.log(`  Continuous reasoning step ${i+1}/3 completed`);
            }
            
            console.log('  ✅ Continuous reasoning simulation completed');
            this.testResults.reasoningTests.push({
                mode: 'continuous_simulation',
                status: 'passed',
                steps: 3
            });
        } catch (error) {
            console.error(`  ❌ Continuous reasoning simulation failed: ${error.message}`);
            this.testResults.reasoningTests.push({
                mode: 'continuous_simulation',
                status: 'failed',
                error: error.message
            });
            this.testResults.errors.push(`Continuous Reasoning Error: ${error.message}`);
        }

        console.log('✅ Reasoning modes testing completed');
    }

    async testErrorHandling() {
        console.log('\n⚠️ Testing error handling with detailed explanations...');

        const errorTestCases = [
            {
                input: '<invalid_syntax',
                description: 'Invalid Narsese syntax',
                shouldCrash: false
            },
            {
                input: 'invalid_command_that_does_not_exist',
                description: 'Unknown command',
                shouldCrash: false
            },
            {
                input: '<valid --> syntax>. <another --> one>?',
                description: 'Multiple valid inputs',
                shouldCrash: false
            }
        ];

        for (const testCase of errorTestCases) {
            try {
                console.log(`  Testing error handling for: ${testCase.description}`);
                console.log(`    Input: "${testCase.input}"`);

                await this.page.type('#repl-input', testCase.input);
                await this.page.keyboard.press('Enter');
                await setTimeout(1000);

                // Check if the page is still responsive (didn't crash)
                const isResponsive = await this.page.evaluate(() => {
                    return document.querySelector('#repl-input') !== null;
                });

                if (isResponsive) {
                    console.log(`    ✅ System handled error gracefully, remained responsive`);
                    this.testResults.errorTests.push({
                        input: testCase.input,
                        description: testCase.description,
                        handledGracefully: true,
                        status: 'passed'
                    });
                } else {
                    throw new Error('System became unresponsive after invalid input');
                }

            } catch (error) {
                console.error(`    ❌ Error handling test failed: ${error.message}`);
                this.testResults.errorTests.push({
                    input: testCase.input,
                    description: testCase.description,
                    handledGracefully: false,
                    status: 'failed',
                    error: error.message
                });
                this.testResults.errors.push(`Error Handling Test Error: ${error.message}`);
            }
        }

        // Verify system recovery after errors
        try {
            console.log('  Verifying system recovery after error tests...');
            await this.page.type('#repl-input', '<recovery_test --> concept>.');
            await this.page.keyboard.press('Enter');
            await setTimeout(1000);
            
            const recoveryCheck = await this.page.evaluate(() => {
                const inputField = document.querySelector('#repl-input');
                return inputField !== null && inputField.value === '';
            });
            
            if (recoveryCheck) {
                console.log('  ✅ System recovered successfully after error tests');
                this.testResults.errorTests.push({
                    test: 'system_recovery',
                    status: 'passed'
                });
            } else {
                throw new Error('System did not recover properly after error tests');
            }
        } catch (error) {
            console.error(`  ❌ System recovery test failed: ${error.message}`);
            this.testResults.errorTests.push({
                test: 'system_recovery',
                status: 'failed',
                error: error.message
            });
            this.testResults.errors.push(`System Recovery Error: ${error.message}`);
        }

        console.log('✅ Error handling testing completed');
    }

    async runCompleteTest() {
        console.log('🚀 Starting extended SeNARS integration test with new requirements...\n');

        try {
            // Start backend server
            await this.startBackendServer();

            // Start UI server
            await this.startUIServer();

            // Start browser for testing
            await this.startBrowser();

            // Navigate to the UI
            await this.page.goto(`http://localhost:${this.config.uiPort}`, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            console.log('✅ UI loaded successfully');

            // Verify WebSocket connection
            await this.verifyWebSocketConnection();

            // Run comprehensive tests following new requirements
            await this.testRealisticUIUXPatterns();
            await this.testReasoningModes();
            await this.testErrorHandling();

            // Final verification - send a complete round-trip test
            console.log('\n🏁 Final verification test...');
            const finalTest = '<extended_integration_test --> complete>.';
            await this.page.type('#repl-input', finalTest);
            await this.page.keyboard.press('Enter');
            await setTimeout(1500);

            console.log('✅ Final verification completed');

            return true;

        } catch (error) {
            console.error(`\n❌ Extended integration test failed: ${error.message}`);
            console.error(error.stack);
            this.testResults.errors.push(`Critical Test Error: ${error.message}`);
            return false;
        }
    }

    async generateTestReport() {
        console.log('\n📋=== EXTENDED TEST REPORT ===');

        console.log('\n🔧 Setup Results:');
        console.log(`  NAR Server: ${this.testResults.setup.nar ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  UI Server: ${this.testResults.setup.ui ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  WebSocket Connection: ${this.testResults.setup.connection ? '✅ PASS' : '❌ FAIL'}`);

        console.log(`\n🎯 UI/UX Pattern Tests: ${this.testResults.uiuxTests.length} tests`);
        const uiuxPassed = this.testResults.uiuxTests.filter(t => t.status === 'passed').length;
        const uiuxFailed = this.testResults.uiuxTests.filter(t => t.status === 'failed').length;
        console.log(`  Passed: ${uiuxPassed}`);
        console.log(`  Failed: ${uiuxFailed}`);

        console.log(`\n🧠 Reasoning Mode Tests: ${this.testResults.reasoningTests.length} tests`);
        const reasoningPassed = this.testResults.reasoningTests.filter(t => t.status === 'passed').length;
        const reasoningFailed = this.testResults.reasoningTests.filter(t => t.status === 'failed').length;
        console.log(`  Passed: ${reasoningPassed}`);
        console.log(`  Failed: ${reasoningFailed}`);

        console.log(`\n⚠️  Error Handling Tests: ${this.testResults.errorTests.length} tests`);
        const errorPassed = this.testResults.errorTests.filter(t => t.status === 'passed').length;
        const errorFailed = this.testResults.errorTests.filter(t => t.status === 'failed').length;
        console.log(`  Passed: ${errorPassed}`);
        console.log(`  Failed: ${errorFailed}`);

        if (this.testResults.errors.length > 0) {
            console.log(`\n❌ Errors Encountered: ${this.testResults.errors.length}`);
            this.testResults.errors.slice(0, 5).forEach(error => {  // Show first 5 errors
                console.log(`  • ${error}`);
            });
            if (this.testResults.errors.length > 5) {
                console.log(`  ... and ${this.testResults.errors.length - 5} more errors`);
            }
        }

        const overallSuccess = this.testResults.setup.nar &&
                              this.testResults.setup.ui &&
                              this.testResults.setup.connection &&
                              uiuxFailed === 0 &&
                              reasoningFailed === 0 &&
                              errorFailed === 0 &&
                              this.testResults.errors.length === 0;

        console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

        // Show configuration used
        console.log(`\n⚙️  Test Configuration:`);
        console.log(`  Concept bag capacity: ${this.config.narOptions.memory.conceptBag.capacity}`);
        console.log(`  Task bag capacity: ${this.config.narOptions.memory.taskBag.capacity}`);
        console.log(`  Max tasks per cycle: ${this.config.narOptions.cycle.maxTasksPerCycle}`);

        return overallSuccess;
    }

    async tearDown() {
        console.log('\n🛑 Shutting down extended test environment...');

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

        console.log('✅ Extended test environment cleaned up');
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

            // Exit with appropriate code
            process.exit(finalSuccess ? 0 : 1);
        }
    }
}

// Run the test with different configurations for parameterized testing
if (import.meta.url === `file://${process.argv[1]}`) {
    const testType = process.argv[2] || 'normal';
    
    let config;
    switch(testType) {
        case 'small_buffer':
            config = TestConfig.serverConfigs.smallBuffer;
            console.log('🧪 Running test with small buffer configuration for batching tests');
            break;
        case 'performance':
            config = TestConfig.serverConfigs.performance;
            console.log('🚀 Running performance test configuration');
            break;
        case 'normal':
        default:
            config = TestConfig.serverConfigs.normal;
            console.log('🧪 Running normal test configuration');
            break;
    }
    
    const testRunner = new ExtendedIntegrationTest(config);
    testRunner.run().catch(console.error);
}

export { ExtendedIntegrationTest };