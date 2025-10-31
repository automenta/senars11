#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { config as appConfig } from '../../src/config.js';
import { createWebSocketClient } from '../../src/utils/websocket-client.js';
import { createAutomation } from '../../src/utils/automation.js';

const execAsync = promisify(exec);

// Configuration for the live demo
const DEMO_CONFIG = Object.freeze({
    WEBSOCKET_PORT: appConfig.demo.defaultWsPort,  // Changed to avoid conflicts
    UI_PORT: appConfig.demo.defaultPort + 3,      // Changed to avoid conflicts (5176)
    DURATION: 60000, // 1 minute demo
    DEMONSTRATION_TYPES: [
        'priority-fluctuations',
        'derivations',
        'memory-dynamics',
        'reasoning-chains'
    ],
    STARTUP_DELAYS: {
        server: 4000,
        ui: 5000,
        automation: 5000
    },
    BASE_TERMS: ['cat', 'dog', 'bird', 'fish', 'animal', 'mammal', 'pet', 'living']
});

/**
 * Log an event to demo data
 */
function logEvent(demoData, source, message) {
    demoData.events.push({
        timestamp: Date.now(),
        source,
        message,
        relativeTime: Date.now() - demoData.startTime
    });
    
    // Update metrics based on message content
    if (message.includes('derivation') || message.includes('reasoning')) {
        demoData.metrics.derivationsMade++;
    }
    if (message.includes('priority')) {
        demoData.metrics.priorityChanges++;
    }
    if (message.includes('task')) {
        demoData.metrics.tasksProcessed++;
    }
    if (message.includes('connected')) {
        demoData.metrics.connections++;
    }
}

/**
 * Create automation script content using shared utilities
 */
function createAutomationScript(webSocketPort) {
    return `
// Use a dynamic import to load the WebSocket library
async function runDemoAutomation() {
    // Add a small delay to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, ${DEMO_CONFIG.STARTUP_DELAYS.automation}));

    try {
        // Use the SeNARS shared utilities that are available in the main process
        const { createWebSocketClient, createAutomation } = await import('../../src/utils/websocket-client.js');
        const { createAutomation: createDemoAutomation } = await import('../../src/utils/automation.js');

        // Create WebSocket client with the demo server connection
        const wsUrl = 'ws://localhost:' + ${webSocketPort} + '/ws';
        const client = createWebSocketClient(wsUrl);

        // Register event handlers
        client.on('open', () => {
            console.log('Demo automation connected');
            
            // Create and start demo automation
            const demoAutomation = createDemoAutomation('demo', client, {
                baseTerms: ${JSON.stringify(DEMO_CONFIG.BASE_TERMS)}
            });
            demoAutomation.start();
        });

        client.on('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'narseseInput') {
                    console.log('Processing narsese input:', data.payload.input);
                    // Echo back as a task to show it was processed
                    client.send({
                        type: 'taskUpdate',
                        payload: {
                            id: 'echo_' + Date.now(),
                            content: data.payload.input,
                            priority: Math.random(),
                            creationTime: Date.now(),
                            type: data.payload.input.includes('?') ? 'question' : data.payload.input.includes('!') ? 'goal' : 'belief'
                        }
                    });
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        client.on('close', () => {
            console.log('Demo automation disconnected');
        });

        client.on('error', (error) => {
            console.error('WebSocket error in automation:', error);
        });

        // Connect to the server
        client.connect();
        
        // Keep the process alive for the demo duration
        setTimeout(() => {
            if (client) {
                client.close();
            }
        }, ${DEMO_CONFIG.DURATION});

    } catch (error) {
        console.error('Error in demo automation:', error);
    }
}

// Execute the demo automation
runDemoAutomation().catch(err => console.error('Demo automation error:', err));
`;
}

/**
 * Create and configure a child process with common event handlers
 */
function createProcessWithLogging(spawnArgs, logPrefix, processes, demoData) {
    const childProcess = spawn(...spawnArgs);

    childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[${logPrefix}] ${output.trim()}`);
        if (demoData) {
            logEvent(demoData, logPrefix.toLowerCase(), output.trim());
        }
    });

    childProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(`[${logPrefix} ERROR] ${error}`);
    });

    processes.push(childProcess);
    return childProcess;
}

/**
 * Setup demo environment
 */
async function setupDemo() {
    console.log('🚀 Setting up live demo environment...');

    // Create demo results directory
    await fs.mkdir('demo-results', { recursive: true });
    await fs.mkdir('demo-results/logs', { recursive: true });

    console.log('✅ Demo environment ready');

    return {
        startTime: Date.now(),
        events: [],
        metrics: {
            tasksProcessed: 0,
            derivationsMade: 0,
            priorityChanges: 0,
            connections: 0
        }
    };
}

/**
 * Start the WebSocket server
 */
async function startWebSocketServer(demoData, processes) {
    console.log(`🔌 Starting WebSocket server on port ${DEMO_CONFIG.WEBSOCKET_PORT}...`);

    createProcessWithLogging(
        ['node', ['webui.js'], {
            env: {
                ...process.env,
                WS_PORT: DEMO_CONFIG.WEBSOCKET_PORT,
                WS_HOST: 'localhost',
                VITE_WS_PORT: DEMO_CONFIG.WEBSOCKET_PORT
            },
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        }],
        'SERVER',
        processes,
        demoData
    );

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, DEMO_CONFIG.STARTUP_DELAYS.server));

    console.log('✅ WebSocket server started');
}

/**
 * Start the demo UI
 */
async function startDemoUI(demoData, processes) {
    console.log(`🖥️  Starting demo UI on port ${DEMO_CONFIG.UI_PORT}...`);

    createProcessWithLogging(
        ['npx', ['vite', '-c', 'simple-uis/vite.config.js'], {
            env: {
                ...process.env,
                PORT: DEMO_CONFIG.UI_PORT,
                VITE_WS_PORT: DEMO_CONFIG.WEBSOCKET_PORT,
                VITE_WS_HOST: 'localhost'
            },
            cwd: path.join(process.cwd(), 'ui'),
            stdio: ['pipe', 'pipe', 'pipe']
        }],
        'UI',
        processes,
        demoData
    );

    // Wait for UI to start
    await new Promise(resolve => setTimeout(resolve, DEMO_CONFIG.STARTUP_DELAYS.ui));

    console.log('✅ Demo UI started');
}

/**
 * Start demo automation
 */
async function startDemoAutomation(demoData, processes) {
    console.log('🤖 Starting demo automation...');

    const automationScript = createAutomationScript(DEMO_CONFIG.WEBSOCKET_PORT);
    const automationPath = path.join(process.cwd(), 'demo-automation-tmp.js');
    await fs.writeFile(automationPath, automationScript);

    createProcessWithLogging(
        ['node', [automationPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        }],
        'AUTOMATION',
        processes,
        demoData
    );

    console.log('✅ Demo automation started');
}

/**
 * Generate demo report
 */
async function generateDemoReport(demoData) {
    const report = {
        ...demoData,
        endTime: Date.now(),
        duration: Date.now() - demoData.startTime,
        summary: {
            totalEvents: demoData.events.length,
            tasksProcessed: demoData.metrics.tasksProcessed,
            derivationsMade: demoData.metrics.derivationsMade,
            priorityChanges: demoData.metrics.priorityChanges,
            connections: demoData.metrics.connections
        }
    };

    const reportPath = path.join(process.cwd(), 'demo-results', 'demo-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Create a summary text file
    const summaryPath = path.join(process.cwd(), 'demo-results', 'demo-summary.txt');
    const summary = `LIVE DEMO SUMMARY
================
Start Time: ${new Date(demoData.startTime).toISOString()}
End Time: ${new Date(report.endTime).toISOString()}
Duration: ${(report.duration / 1000).toFixed(1)} seconds

METRICS
=======
Tasks Processed: ${report.summary.tasksProcessed}
Derivations Made: ${report.summary.derivationsMade}
Priority Changes: ${report.summary.priorityChanges}
Connections: ${report.summary.connections}
Total Events: ${report.summary.totalEvents}

EVENT LOG
=========
${demoData.events.slice(-20).map(e => '[' + new Date(e.timestamp).toLocaleTimeString() + '] ' + e.source + ': ' + e.message).join('\\n')}
`;

    await fs.writeFile(summaryPath, summary);

    console.log(`\\n📋 Demo report saved to: ${reportPath}`);
    console.log(`📋 Demo summary saved to: ${summaryPath}`);

    // Show key metrics
    console.log(`\\n🏆 Demo Results:`);
    console.log(`  • ${report.summary.tasksProcessed} tasks processed`);
    console.log(`  • ${report.summary.derivationsMade} derivations made`);
    console.log(`  • ${report.summary.priorityChanges} priority changes`);
    console.log(`  • ${report.summary.connections} connections`);
}

/**
 * Cleanup demo processes and temporary files
 */
async function cleanupDemo(processes) {
    console.log('\\n🔄 Cleaning up demo processes...');

    // Kill all processes
    processes.forEach(process => {
        if (!process.killed) {
            process.kill();
        }
    });

    // Clear temporary files
    try {
        await fs.unlink(path.join(process.cwd(), 'demo-automation-tmp.js'));
    } catch (err) {
        // Ignore if file doesn't exist
    }

    console.log('✅ Cleanup completed');
}

/**
 * Run the complete demo
 */
async function runDemo() {
    const processes = [];
    let demoData;

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\\n⚠️  Received SIGINT, shutting down demo...');
        await cleanupDemo(processes);
        process.exit(0);
    });

    try {
        demoData = await setupDemo();
        await startWebSocketServer(demoData, processes);
        await startDemoUI(demoData, processes);
        await startDemoAutomation(demoData, processes);

        console.log(`\\n🎯 Demo is now running!`);
        console.log(`📡 WebSocket Server: ws://localhost:${DEMO_CONFIG.WEBSOCKET_PORT}`);
        console.log(`🌐 Demo UI: http://localhost:${DEMO_CONFIG.UI_PORT}`);
        console.log(`⏳ Demo duration: ${DEMO_CONFIG.DURATION / 1000} seconds`);
        console.log(`\\n📋 Demonstrating:`);
        DEMO_CONFIG.DEMONSTRATION_TYPES.forEach(type => {
            console.log(`  • ${type.replace('-', ' ')}`);
        });

        // Wait for demo to complete
        await new Promise(resolve => setTimeout(resolve, DEMO_CONFIG.DURATION));

        console.log('\\n📊 Generating demo report...');
        await generateDemoReport(demoData);

        return true;
    } catch (error) {
        console.error('❌ Demo error:', error);
        return false;
    } finally {
        await cleanupDemo(processes);
    }
}

// Execute
runDemo()
    .then(success => {
        console.log(`\\n🎉 Demo ${success ? 'COMPLETED SUCCESSFULLY' : 'FAILED'}`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Demo execution error:', error);
        process.exit(1);
    });