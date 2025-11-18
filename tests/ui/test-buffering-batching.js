/**
 * @file test-buffering-batching.js
 * @description Test buffering/batching mechanisms with small capacities
 *
 * This test specifically validates the system's behavior under constrained memory conditions
 * to ensure robust operation regardless of buffer capacity settings.
 */

import { setTimeout } from 'timers/promises';
import { TestConfig } from './test-config.js';
import { BaseUITest, TestError } from './test-utils.js';

class BufferingBatchingTest extends BaseUITest {
    constructor(config = TestConfig.serverConfigs.smallBuffer) {
        super(config, { headless: true });
        this.testResults.bufferingTests = [];
        this.testResults.batchingTests = [];
    }

    initTestResults() {
        return {
            setup: { nar: false, ui: false, connection: false },
            operations: [],
            bufferingTests: [],
            batchingTests: [],
            errors: []
        };
    }

    async startNARServer() {
        console.log(`🚀 Starting NAR server with small buffer configuration...`);
        console.log(`   Port: ${this.config.port}`);
        console.log(`   Concept bag capacity: ${this.config.narOptions.memory.conceptBag.capacity}`);
        console.log(`   Task bag capacity: ${this.config.narOptions.memory.taskBag.capacity}`);
        console.log(`   Max tasks per cycle: ${this.config.narOptions.cycle.maxTasksPerCycle}`);

        // Create the backend server as a child process with the small buffer configuration
        this.narProcess = spawn('node', ['-e', `
            import {NAR} from '../src/nar/NAR.js';
            import {WebSocketMonitor} from '../src/server/WebSocketMonitor.js';

            async function startServer() {
                console.log('=== NAR BACKEND WITH SMALL BUFFERS ===');
                console.log('Initializing NAR with small capacity bags...');

                // Create NAR with small buffer configuration to test buffering mechanisms
                const nar = new NAR(${JSON.stringify(this.config.narOptions)});

                try {
                    await nar.initialize();
                    console.log('✅ NAR initialized with small buffers');

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

                    console.log('=== NAR BACKEND READY WITH SMALL BUFFERS ===');
                    
                    // Setup monitoring of buffer state
                    nar.on('task.bag.full', (data) => {
                        console.log('BUFFER_EVENT: task bag full, triggering removal:', data?.task?.term?.toString?.() || 'unknown');
                    });
                    
                    nar.on('concept.bag.full', (data) => {
                        console.log('BUFFER_EVENT: concept bag full, triggering removal:', data?.concept?.term?.toString?.() || 'unknown');
                    });

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
            
            // Log important events without overwhelming the output
            if (str.includes('NAR BACKEND READY') || str.includes('BUFFER_EVENT') || str.includes('ERROR')) {
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
        while (!output.includes('NAR BACKEND READY')) {
            if (Date.now() - startTime > 15000) { // 15 second timeout
                throw new Error('NAR server failed to start within 15 seconds');
            }
            await setTimeout(100);
        }

        console.log('✅ NAR server with small buffers is ready!');
        return true;
    }

    async startUIServer() {
        console.log(`🚀 Starting UI server on port ${this.config.uiPort}...`);

        // Start the UI server using vite with specific environment variables
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

    async startBrowser(config = TestConfig.uiConfigs.normal) {
        console.log('🚀 Launching browser for buffering/batching tests...');

        this.browser = await puppeteer.launch({
            headless: config.headless,
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

        console.log('✅ Browser launched with comprehensive debugging');
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
            // Look for connection status indicators in the UI
            const statusBar = document.querySelector('#status-bar');
            return statusBar && (
                statusBar.textContent.toLowerCase().includes('connected') ||
                statusBar.classList.contains('status-connected') ||
                statusBar.textContent.includes('Connected')
            );
        }, { timeout: 20000 });

        console.log('✅ WebSocket connection established');
    }

    async testBufferingUnderLoad() {
        console.log('\n🧪 Testing buffering mechanisms under load with small capacities...');

        // Test input that forces buffer management due to small capacity
        const testInputs = [];
        for (let i = 0; i < 10; i++) {
            testInputs.push(`<buffer_test_${i} --> concept_${i}>.`);
        }

        console.log(`   Sending ${testInputs.length} inputs to stress the buffer...`);

        for (let i = 0; i < testInputs.length; i++) {
            const input = testInputs[i];
            
            try {
                console.log(`   Processing input ${i+1}/10: ${input.substring(0, 30)}...`);
                
                // Find and interact with the REPL input
                const replInputSelector = '#repl-input';
                await this.page.waitForSelector(replInputSelector, { timeout: 5000 });
                await this.page.type(replInputSelector, input);
                await this.page.keyboard.press('Enter');

                // Wait briefly between inputs to allow processing
                await setTimeout(300);

                // Verify the system is still responsive by checking for basic response
                const isResponsive = await this.page.evaluate(() => {
                    const inputField = document.querySelector('#repl-input');
                    return inputField !== null;
                });

                if (isResponsive) {
                    console.log(`   ✅ System remains responsive after input ${i+1}`);
                    this.testResults.bufferingTests.push({
                        input: input,
                        status: 'processed',
                        index: i
                    });
                } else {
                    throw new Error(`System became unresponsive after input ${i+1}`);
                }

            } catch (error) {
                console.error(`   ❌ Error processing input ${i+1}: ${error.message}`);
                this.testResults.bufferingTests.push({
                    input: input,
                    status: 'failed',
                    error: error.message,
                    index: i
                });
                this.testResults.errors.push(`Buffering test error: ${error.message}`);
            }
        }

        console.log('✅ Buffering under load test completed');
    }

    async testBatchingMechanisms() {
        console.log('\n🧪 Testing batching mechanisms with small batch sizes...');

        // Test reasoning with small batch sizes to ensure proper batching
        const batchCommands = [
            '*step',  // Single step as defined in small batch config
            '*volume=2',  // Set volume to small number
            '<batch_test --> concept>.'  // Test input
        ];

        for (let i = 0; i < batchCommands.length; i++) {
            const command = batchCommands[i];
            
            try {
                console.log(`   Executing batch command ${i+1}: ${command}`);
                
                const replInputSelector = '#repl-input';
                await this.page.type(replInputSelector, command);
                await this.page.keyboard.press('Enter');

                await setTimeout(800); // Wait for small batch processing

                console.log(`   ✅ Command executed: ${command}`);
                
                this.testResults.batchingTests.push({
                    command: command,
                    status: 'executed',
                    index: i
                });

            } catch (error) {
                console.error(`   ❌ Error executing batch command: ${error.message}`);
                this.testResults.batchingTests.push({
                    command: command,
                    status: 'failed',
                    error: error.message,
                    index: i
                });
                this.testResults.errors.push(`Batching test error: ${error.message}`);
            }
        }

        console.log('✅ Batching mechanisms test completed');
    }

    async testReasoningModes() {
        console.log('\n🧠 Testing different reasoning modes with constrained buffers...');

        try {
            // Test step mode
            console.log('   Testing step mode reasoning...');
            await this.page.type('#repl-input', '*step');
            await this.page.keyboard.press('Enter');
            await setTimeout(500);
            console.log('   ✅ Step mode executed');

            // Add some inputs to create reasoning workload
            await this.page.type('#repl-input', '<reasoning_test_1 --> concept>.');
            await this.page.keyboard.press('Enter');
            await setTimeout(300);
            
            await this.page.type('#repl-input', '<reasoning_test_2 --> concept>.');
            await this.page.keyboard.press('Enter');
            await setTimeout(300);

            // Test continuous mode simulation with multiple steps
            console.log('   Testing continuous mode simulation...');
            for (let i = 0; i < 3; i++) {
                await this.page.type('#repl-input', '*step');
                await this.page.keyboard.press('Enter');
                await setTimeout(400); // Wait between steps
                console.log(`   Continuous step ${i+1}/3 completed`);
            }

            console.log('✅ Reasoning modes test completed');

            this.testResults.batchingTests.push({
                test: 'reasoning_modes',
                status: 'completed'
            });

        } catch (error) {
            console.error(`   ❌ Reasoning modes test failed: ${error.message}`);
            this.testResults.errors.push(`Reasoning modes test error: ${error.message}`);
        }
    }

    async runCompleteTest() {
        console.log('🚀 Starting buffering/batching mechanisms test with small capacities...\n');

        try {
            // Start NAR server with small buffer configuration
            await this.startNARServer();

            // Start UI server
            await this.startUIServer();

            // Start browser for testing
            await this.startBrowser();

            // Navigate to UI and establish connection
            await this.navigateAndConnect();

            // Run buffering tests
            await this.testBufferingUnderLoad();

            // Run batching tests
            await this.testBatchingMechanisms();

            // Test reasoning modes
            await this.testReasoningModes();

            console.log('\n✅ All buffering/batching tests completed successfully!');
            this.testResults.setup = true;
            return true;

        } catch (error) {
            console.error(`\n❌ Buffering/batching test failed: ${error.message}`);
            console.error(error.stack);
            this.testResults.errors.push(`Critical Test Error: ${error.message}`);
            return false;
        }
    }

    async generateTestReport() {
        console.log('\n📋=== BUFFERING/BATCHING TEST REPORT ===');

        console.log(`\n🔧 Setup: ${this.testResults.setup ? '✅ PASS' : '❌ FAIL'}`);

        console.log(`\n📦 Buffering Tests: ${this.testResults.bufferingTests.length} inputs processed`);
        const bufferingPassed = this.testResults.bufferingTests.filter(t => t.status === 'processed').length;
        const bufferingFailed = this.testResults.bufferingTests.filter(t => t.status === 'failed').length;
        console.log(`  Passed: ${bufferingPassed}`);
        console.log(`  Failed: ${bufferingFailed}`);

        console.log(`\n🔄 Batching Tests: ${this.testResults.batchingTests.length} operations tested`);
        const batchingPassed = this.testResults.batchingTests.filter(t => t.status !== 'failed').length;
        const batchingFailed = this.testResults.batchingTests.filter(t => t.status === 'failed').length;
        console.log(`  Passed: ${batchingPassed}`);
        console.log(`  Failed: ${batchingFailed}`);

        if (this.testResults.errors.length > 0) {
            console.log(`\n❌ Errors Encountered: ${this.testResults.errors.length}`);
            this.testResults.errors.slice(0, 5).forEach(error => {
                console.log(`  • ${error}`);
            });
            if (this.testResults.errors.length > 5) {
                console.log(`  ... and ${this.testResults.errors.length - 5} more errors`);
            }
        }

        const overallSuccess = this.testResults.setup && 
                              bufferingFailed === 0 && 
                              batchingFailed === 0 && 
                              this.testResults.errors.length === 0;

        console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        console.log(`\n📊 Summary:`);
        console.log(`  - Tested with concept bag capacity: ${this.config.narOptions.memory.conceptBag.capacity}`);
        console.log(`  - Tested with task bag capacity: ${this.config.narOptions.memory.taskBag.capacity}`);
        console.log(`  - Tested with max tasks per cycle: ${this.config.narOptions.cycle.maxTasksPerCycle}`);

        return overallSuccess;
    }

    async tearDown() {
        console.log('\n🛑 Shutting down buffering/batching test environment...');

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

        console.log('✅ Buffering/batching test environment cleaned up');
    }

    async run() {
        let success = false;

        try {
            success = await this.runCompleteTest();
        } finally {
            const reportSuccess = this.generateTestReport();
            await this.tearDown();

            // Return the more comprehensive result
            const finalSuccess = success && reportSuccess;
            console.log(`\n🏁 Final Test Outcome: ${finalSuccess ? 'SUCCESS' : 'FAILURE'}`);

            process.exit(finalSuccess ? 0 : 1);
        }
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const testRunner = new BufferingBatchingTest();
    testRunner.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(console.error);
}

export { BufferingBatchingTest };