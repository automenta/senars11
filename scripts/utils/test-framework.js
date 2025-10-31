#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Test configuration
const TEST_CONFIG = Object.freeze({
    WEBSOCKET_PORT: 8081,  // Use different port to avoid conflicts
    UI_PORT: 5174,         // Use different port to avoid conflicts
    TEST_DURATION: 30000,  // 30 seconds for initial test
    SCREENSHOT_INTERVAL: 5000, // Screenshot every 5 seconds
    DEMO_RUNNER_PORT: 3002  // Port for automated demo runner
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const createDirectory = async (dirPath) => {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
};

const killExistingProcesses = async () => {
    try {
        // Kill any existing processes on our ports
        await execAsync(`lsof -ti:${TEST_CONFIG.WEBSOCKET_PORT} | xargs kill -9 2>/dev/null || true`);
        await execAsync(`lsof -ti:${TEST_CONFIG.UI_PORT} | xargs kill -9 2>/dev/null || true`);
        await execAsync(`lsof -ti:${TEST_CONFIG.DEMO_RUNNER_PORT} | xargs kill -9 2>/dev/null || true`);
    } catch (error) {
        // Ignore errors if no processes were running
    }
};

const generateDemoScript = (webSocketPort) => `
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:' + ${webSocketPort});

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
            { id: Date.now(), content: '<cat --> animal> ' + (Math.random() > 0.5 ? '.' : '?'), type: 'belief', priority: Math.random() },
            { id: Date.now() + 1, content: '<dog --> mammal> ' + (Math.random() > 0.5 ? '.' : '?'), type: 'belief', priority: Math.random() },
            { id: Date.now() + 2, content: '<bird --> flyer> ' + (Math.random() > 0.5 ? '.' : '?'), type: 'goal', priority: Math.random() }
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

const startProcess = (name, spawnArgs, spawnOptions, testResults) => {
    console.log(`Starting ${name}...`);
    
    const process = spawn(...spawnArgs, spawnOptions);

    // Handle output
    process.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[${name.toUpperCase()}] ${output}`);
        captureOutput(`[${name.toUpperCase()}]`, output, testResults);
    });

    process.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(`[${name.toUpperCase()} ERROR] ${error}`);
        testResults.errors.push(`${name} error: ${error}`);
        testResults.success = false;
    });

    process.on('error', (err) => {
        console.error(`${name} process error:`, err);
        testResults.errors.push(`${name} process error: ${err.message}`);
        testResults.success = false;
    });

    return process;
};

const startBackend = async (testResults) => {
    const backendProcess = startProcess('BACKEND', 
        ['node', ['webui.js']], 
        {
            env: {
                ...process.env,
                WS_PORT: TEST_CONFIG.WEBSOCKET_PORT,
                WS_HOST: 'localhost'
            },
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        },
        testResults
    );

    // Wait a bit for backend to start
    await delay(3000);
    
    console.log('✓ WebSocket backend started');
    return backendProcess;
};

const startDemoUI = async (testResults) => {
    const uiProcess = startProcess('UI', 
        ['npx', ['vite', '-c', 'simple-uis/vite.config.js']], 
        {
            env: {
                ...process.env,
                PORT: TEST_CONFIG.UI_PORT,
                VITE_WS_PORT: TEST_CONFIG.WEBSOCKET_PORT,
                VITE_TEST_MODE: 'false'  // Real mode, not test mode
            },
            cwd: path.join(process.cwd(), 'ui'),
            stdio: ['pipe', 'pipe', 'pipe']
        },
        testResults
    );

    // Wait for UI to start
    await delay(5000);
    
    console.log('✓ Demo UI started');
    return uiProcess;
};

const startDemoRunner = async (testResults) => {
    const demoScript = generateDemoScript(TEST_CONFIG.WEBSOCKET_PORT);
    
    // Write the demo runner script to a temporary file
    const demoRunnerPath = path.join(process.cwd(), 'demo-runner-tmp.js');
    await fs.writeFile(demoRunnerPath, demoScript);
    
    const demoRunnerProcess = startProcess('DEMO RUNNER', 
        ['node', [demoRunnerPath]], 
        {
            stdio: ['pipe', 'pipe', 'pipe']
        },
        testResults
    );

    console.log('✓ Automated demo runner started');
    return demoRunnerProcess;
};

const captureOutput = (source, output, testResults) => {
    // Look for errors in output
    if (output.toLowerCase().includes('error') || output.toLowerCase().includes('exception')) {
        testResults.warnings.push(`${source} output contained potential error: ${output}`);
    }
    
    // Look for successful operations
    if (output.toLowerCase().includes('connected') || 
        output.toLowerCase().includes('success') || 
        output.toLowerCase().includes('ready')) {
        console.log(`✅ ${source} ${output.trim()}`);
    }
};

const generateTestReport = async (testResults, reportPath) => {
    const report = {
        ...testResults,
        duration: Date.now() - testResults.startTimestamp,
        testConfig: TEST_CONFIG,
        timestamp: new Date().toISOString()
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📋 Test Report:');
    console.log(`Duration: ${report.duration}ms`);
    console.log(`Errors: ${report.errors.length}`);
    console.log(`Warnings: ${report.warnings.length}`);
    console.log(`Success: ${report.success}`);
    console.log(`Report saved to: ${reportPath}`);
};

const cleanup = async (backendProcess, uiProcess, demoRunnerProcess) => {
    console.log('\n🔄 Cleaning up processes...');
    
    [backendProcess, uiProcess, demoRunnerProcess]
        .filter(Boolean)
        .forEach(process => process.kill());
    
    // Kill any remaining processes on our ports
    await killExistingProcesses();
    
    // Remove temporary demo runner file
    try {
        await fs.unlink(path.join(process.cwd(), 'demo-runner-tmp.js'));
    } catch (err) {
        // Ignore if file doesn't exist
    }
    
    console.log('✓ Cleanup completed');
};

// Execute
(async () => {
    const testResults = {
        startTimestamp: Date.now(),
        errors: [],
        warnings: [],
        screenshots: [],
        success: true
    };
    
    let backendProcess = null;
    let uiProcess = null;
    let demoRunnerProcess = null;
    
    // Handle process termination gracefully
    process.on('SIGINT', async () => {
        console.log('\n⚠️  Received SIGINT, cleaning up...');
        await cleanup(backendProcess, uiProcess, demoRunnerProcess);
        process.exit(0);
    });

    try {
        console.log('Setting up automatic test environment...');
        
        // Kill any existing processes on our ports
        await killExistingProcesses();
        
        // Create screenshots directory
        await createDirectory('test-results/screenshots');
        await createDirectory('test-results/videos');
        
        console.log('✓ Test environment ready');
        
        console.log(`\n🚀 Starting automated tests for ${TEST_CONFIG.TEST_DURATION / 1000}s...`);
        
        // Start all services
        backendProcess = await startBackend(testResults);
        uiProcess = await startDemoUI(testResults);
        demoRunnerProcess = await startDemoRunner(testResults);
        
        // Run the test for the specified duration
        await delay(TEST_CONFIG.TEST_DURATION);
        
        console.log('\n📊 Test completed! Generating report...');
        const reportPath = path.join(process.cwd(), 'test-results', 'test-report.json');
        await generateTestReport(testResults, reportPath);
        
        console.log(`\n🏁 Test run ${testResults.success ? 'PASSED' : 'FAILED'}`);
        process.exit(testResults.success ? 0 : 1);
        
    } catch (error) {
        console.error('Test framework error:', error);
        testResults.errors.push(`Test framework error: ${error.message}`);
        testResults.success = false;
        
        const reportPath = path.join(process.cwd(), 'test-results', 'test-report.json');
        await generateTestReport(testResults, reportPath);
        
        process.exit(1);
    } finally {
        await cleanup(backendProcess, uiProcess, demoRunnerProcess);
    }
})();