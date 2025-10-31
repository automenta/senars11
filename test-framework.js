#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Test configuration
const TEST_CONFIG = {
    WEBSOCKET_PORT: 8081,  // Use different port to avoid conflicts
    UI_PORT: 5174,         // Use different port to avoid conflicts
    TEST_DURATION: 30000,  // 30 seconds for initial test
    SCREENSHOT_INTERVAL: 5000, // Screenshot every 5 seconds
    DEMO_RUNNER_PORT: 3002  // Port for automated demo runner
};

class AutoTestFramework {
    constructor() {
        this.backendProcess = null;
        this.uiProcess = null;
        this.demoRunnerProcess = null;
        this.testResults = {
            startTimestamp: Date.now(),
            errors: [],
            warnings: [],
            screenshots: [],
            success: true
        };
    }

    async setup() {
        console.log('Setting up automatic test environment...');
        
        // Kill any existing processes on our ports
        await this.killExistingProcesses();
        
        // Create screenshots directory
        await this.createDirectory('test-results/screenshots');
        await this.createDirectory('test-results/videos');
        
        console.log('✓ Test environment ready');
    }

    async killExistingProcesses() {
        try {
            // Kill any existing processes on our ports
            await execAsync(`lsof -ti:${TEST_CONFIG.WEBSOCKET_PORT} | xargs kill -9 2>/dev/null || true`);
            await execAsync(`lsof -ti:${TEST_CONFIG.UI_PORT} | xargs kill -9 2>/dev/null || true`);
            await execAsync(`lsof -ti:${TEST_CONFIG.DEMO_RUNNER_PORT} | xargs kill -9 2>/dev/null || true`);
        } catch (error) {
            // Ignore errors if no processes were running
        }
    }

    async createDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    async startBackend() {
        console.log('Starting WebSocket backend...');
        
        // Start the backend server
        this.backendProcess = spawn('node', ['webui.js'], {
            env: {
                ...process.env,
                WS_PORT: TEST_CONFIG.WEBSOCKET_PORT,
                WS_HOST: 'localhost'
            },
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Handle backend output
        this.backendProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[BACKEND] ${output}`);
            this.captureOutput('[BACKEND]', output);
        });

        this.backendProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.error(`[BACKEND ERROR] ${error}`);
            this.testResults.errors.push(`Backend error: ${error}`);
            this.testResults.success = false;
        });

        this.backendProcess.on('error', (err) => {
            console.error(`Backend process error:`, err);
            this.testResults.errors.push(`Backend process error: ${err.message}`);
            this.testResults.success = false;
        });

        // Wait a bit for backend to start
        await this.delay(3000);
        
        console.log('✓ WebSocket backend started');
    }

    async startDemoUI() {
        console.log('Starting demo UI...');
        
        // Start the simple UIs in demo mode
        this.uiProcess = spawn('npx', ['vite', '-c', 'simple-uis/vite.config.js'], {
            env: {
                ...process.env,
                PORT: TEST_CONFIG.UI_PORT,
                VITE_WS_PORT: TEST_CONFIG.WEBSOCKET_PORT,
                VITE_TEST_MODE: 'false'  // Real mode, not test mode
            },
            cwd: path.join(process.cwd(), 'ui'),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Handle UI output
        this.uiProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[UI] ${output}`);
            this.captureOutput('[UI]', output);
        });

        this.uiProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.error(`[UI ERROR] ${error}`);
            this.testResults.errors.push(`UI error: ${error}`);
            this.testResults.success = false;
        });

        this.uiProcess.on('error', (err) => {
            console.error(`UI process error:`, err);
            this.testResults.errors.push(`UI process error: ${err.message}`);
            this.testResults.success = false;
        });

        // Wait for UI to start
        await this.delay(5000);
        
        console.log('✓ Demo UI started');
    }

    async startDemoRunner() {
        console.log('Starting automated demo runner...');
        
        const demoScript = `
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:${TEST_CONFIG.WEBSOCKET_PORT}');

ws.on('open', () => {
    console.log('Demo runner connected to WebSocket');
    
    // Send initial demo list
    ws.send(JSON.stringify({
        type: 'demoList',
        payload: [
            { id: 'derivation-demo', name: 'Derivation Demo', description: 'Demonstrates belief derivations' },
            { id: 'priority-demo', name: 'Priority Demo', description: 'Shows priority fluctuations' }
        ]
    }));

    // Send periodic system metrics to simulate activity
    setInterval(() => {
        ws.send(JSON.stringify({
            type: 'systemMetrics',
            payload: {
                wsConnected: true,
                cpu: Math.random() * 100,
                memory: Math.random() * 100,
                activeTasks: Math.floor(Math.random() * 20),
                reasoningSpeed: Math.floor(Math.random() * 1000)
            }
        }));
    }, 2000);

    // Send periodic task updates to simulate derivations
    setInterval(() => {
        const tasks = [
            { id: Date.now(), content: '<cat --> animal> ${Math.random() > 0.5 ? '.' : '?' }', type: 'belief', priority: Math.random() },
            { id: Date.now() + 1, content: '<dog --> mammal> ${Math.random() > 0.5 ? '.' : '?' }', type: 'belief', priority: Math.random() },
            { id: Date.now() + 2, content: '<bird --> flyer> ${Math.random() > 0.5 ? '.' : '?' }', type: 'goal', priority: Math.random() }
        ];
        
        tasks.forEach(task => {
            ws.send(JSON.stringify({
                type: 'taskUpdate',
                payload: task
            }));
        });
    }, 3000);

    // Send concept updates to show priority fluctuations
    setInterval(() => {
        const concepts = [
            { term: 'cat', priority: Math.random(), truth: { frequency: Math.random(), confidence: Math.random() } },
            { term: 'dog', priority: Math.random(), truth: { frequency: Math.random(), confidence: Math.random() } },
            { term: 'bird', priority: Math.random(), truth: { frequency: Math.random(), confidence: Math.random() } }
        ];
        
        concepts.forEach(concept => {
            ws.send(JSON.stringify({
                type: 'conceptUpdate',
                payload: { concept, changeType: 'updated' }
            }));
        });
    }, 2500);
}, 1000);

ws.on('message', (data) => {
    console.log('Received from UI:', data.toString());
});

ws.on('error', (err) => {
    console.error('WebSocket error:', err);
});

ws.on('close', () => {
    console.log('Demo runner disconnected');
});
`;

        // Write the demo runner script to a temporary file
        const demoRunnerPath = path.join(process.cwd(), 'demo-runner-tmp.js');
        await fs.writeFile(demoRunnerPath, demoScript);
        
        this.demoRunnerProcess = spawn('node', [demoRunnerPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.demoRunnerProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[DEMO RUNNER] ${output}`);
            this.captureOutput('[DEMO RUNNER]', output);
        });

        this.demoRunnerProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.error(`[DEMO RUNNER ERROR] ${error}`);
            this.testResults.warnings.push(`Demo runner error: ${error}`);
        });

        this.demoRunnerProcess.on('error', (err) => {
            console.error(`Demo runner process error:`, err);
            this.testResults.errors.push(`Demo runner process error: ${err.message}`);
        });

        console.log('✓ Automated demo runner started');
    }

    captureOutput(source, output) {
        // Look for errors in output
        if (output.toLowerCase().includes('error') || output.toLowerCase().includes('exception')) {
            this.testResults.warnings.push(`${source} output contained potential error: ${output}`);
        }
        
        // Look for successful operations
        if (output.toLowerCase().includes('connected') || 
            output.toLowerCase().includes('success') || 
            output.toLowerCase().includes('ready')) {
            console.log(`✅ ${source} ${output.trim()}`);
        }
    }

    async runTests() {
        console.log(`\n🚀 Starting automated tests for ${TEST_CONFIG.TEST_DURATION / 1000}s...`);
        
        try {
            await this.setup();
            await this.startBackend();
            await this.startDemoUI();
            await this.startDemoRunner();
            
            // Run the test for the specified duration
            await this.delay(TEST_CONFIG.TEST_DURATION);
            
            console.log('\n📊 Test completed! Generating report...');
            await this.generateTestReport();
            
            return this.testResults;
        } catch (error) {
            console.error('Test framework error:', error);
            this.testResults.errors.push(`Test framework error: ${error.message}`);
            this.testResults.success = false;
            await this.generateTestReport();
            return this.testResults;
        }
    }

    async generateTestReport() {
        const report = {
            ...this.testResults,
            duration: Date.now() - this.testResults.startTimestamp,
            testConfig: TEST_CONFIG,
            timestamp: new Date().toISOString()
        };

        const reportPath = path.join(process.cwd(), 'test-results', 'test-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📋 Test Report:');
        console.log(`Duration: ${report.duration}ms`);
        console.log(`Errors: ${report.errors.length}`);
        console.log(`Warnings: ${report.warnings.length}`);
        console.log(`Success: ${report.success}`);
        console.log(`Report saved to: ${reportPath}`);
    }

    async cleanup() {
        console.log('\n🔄 Cleaning up processes...');
        
        if (this.backendProcess) {
            this.backendProcess.kill();
        }
        
        if (this.uiProcess) {
            this.uiProcess.kill();
        }
        
        if (this.demoRunnerProcess) {
            this.demoRunnerProcess.kill();
        }
        
        // Kill any remaining processes on our ports
        await this.killExistingProcesses();
        
        // Remove temporary demo runner file
        try {
            await fs.unlink(path.join(process.cwd(), 'demo-runner-tmp.js'));
        } catch (err) {
            // Ignore if file doesn't exist
        }
        
        console.log('✓ Cleanup completed');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the test framework
async function runTests() {
    const framework = new AutoTestFramework();
    
    try {
        const results = await framework.runTests();
        console.log(`\n🏁 Test run ${results.success ? 'PASSED' : 'FAILED'}`);
        process.exit(results.success ? 0 : 1);
    } catch (error) {
        console.error('Test execution error:', error);
        process.exit(1);
    } finally {
        await framework.cleanup();
    }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
    console.log('\n⚠️  Received SIGINT, cleaning up...');
    // Framework cleanup will run automatically
    process.exit(0);
});

// Execute
runTests();