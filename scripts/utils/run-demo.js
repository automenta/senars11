#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Configuration for the live demo
const DEMO_CONFIG = Object.freeze({
    WEBSOCKET_PORT: 8083,  // Changed to avoid conflicts
    UI_PORT: 5176,         // Changed to avoid conflicts
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
 * Create automation script content
 */
function createAutomationScript(webSocketPort) {
    return `
// Use a dynamic import to load the WebSocket library
async function runDemoAutomation() {
    // Add a small delay to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, ${DEMO_CONFIG.STARTUP_DELAYS.automation}));

    const { WebSocket } = await import('ws');

    // Function to try connecting with retries
    async function connectWithRetry(url, retries = 5) {
        for (let i = 0; i < retries; i++) {
            try {
                return new Promise((resolve, reject) => {
                    const ws = new WebSocket(url);

                    ws.on('open', () => {
                        console.log('Demo automation connected on attempt', i + 1);
                        resolve(ws);
                    });

                    ws.on('error', (error) => {
                        if (i === retries - 1) {
                            console.error('Failed to connect after', retries, 'attempts:', error.message);
                            reject(error);
                        } else {
                            console.log('Connection attempt', i + 1, 'failed, retrying...', error.message);
                        }
                    });

                    ws.on('close', () => {
                        console.log('WebSocket closed');
                    });
                });
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            }
        }
    }

    let ws;
    try {
        ws = await connectWithRetry('ws://localhost:' + ${webSocketPort} + '/ws');
    } catch (error) {
        console.error('Could not connect to WebSocket:', error.message);
        return;
    }

    ws.on('open', () => {
        console.log('Demo automation connected');

        // Send initial system metrics
        ws.send(JSON.stringify({
            type: 'systemMetrics',
            payload: {
                wsConnected: true,
                cpu: 25,
                memory: 30,
                activeTasks: 0,
                reasoningSpeed: 0
            }
        }));

        // Send initial demo list
        ws.send(JSON.stringify({
            type: 'demoList',
            payload: [
                { id: 'derivation-demo', name: 'Belief Derivation Demo', description: 'Shows how beliefs are derived from other beliefs' },
                { id: 'priority-demo', name: 'Priority Fluctuation Demo', description: 'Shows how concept priorities change over time' },
                { id: 'reasoning-chain', name: 'Reasoning Chain Demo', description: 'Multi-step reasoning process' }
            ]
        }));

        // Simulate periodic activity
        setInterval(() => {
            // Send system metrics
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'systemMetrics',
                    payload: {
                        wsConnected: true,
                        cpu: Math.random() * 40 + 10, // 10-50%
                        memory: Math.random() * 50 + 20, // 20-70%
                        activeTasks: Math.floor(Math.random() * 10),
                        reasoningSpeed: Math.floor(Math.random() * 500) + 50
                    }
                }));
            }
        }, 3000);

        // Generate derivations
        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && Math.random() > 0.7) { // 30% chance each interval
                const baseTerms = ['cat', 'dog', 'bird', 'fish', 'animal', 'mammal', 'pet', 'living'];
                const term1 = baseTerms[Math.floor(Math.random() * baseTerms.length)];
                const term2 = baseTerms[Math.floor(Math.random() * baseTerms.length)];

                if (term1 !== term2) {
                    const derivation = {
                        type: 'reasoningStep',
                        payload: {
                            id: 'reasoning_' + Date.now(),
                            timestamp: Date.now(),
                            input: '<' + term1 + ' --> ' + term2 + '>.',
                            output: '<' + term2 + ' --> ' + term1 + '>?',
                            rule: ['deduction', 'induction', 'abduction', 'comparison'][Math.floor(Math.random() * 4)],
                            confidence: Math.random(),
                            priority: Math.random()
                        }
                    };

                    ws.send(JSON.stringify(derivation));

                    // Also send as a task update
                    ws.send(JSON.stringify({
                        type: 'taskUpdate',
                        payload: {
                            id: 'task_' + Date.now(),
                            content: derivation.payload.output,
                            priority: derivation.payload.priority,
                            creationTime: Date.now(),
                            type: Math.random() > 0.8 ? 'goal' : Math.random() > 0.5 ? 'question' : 'belief'
                        }
                    }));
                }
            }
        }, 2000);

        // Simulate priority fluctuations
        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                const concepts = [
                    { term: 'cat', priority: Math.random(), occurrenceTime: Date.now(), truth: { frequency: Math.random(), confidence: Math.random() } },
                    { term: 'dog', priority: Math.random(), occurrenceTime: Date.now(), truth: { frequency: Math.random(), confidence: Math.random() } },
                    { term: 'bird', priority: Math.random(), occurrenceTime: Date.now(), truth: { frequency: Math.random(), confidence: Math.random() } },
                    { term: 'fish', priority: Math.random(), occurrenceTime: Date.now(), truth: { frequency: Math.random(), confidence: Math.random() } }
                ];

                concepts.forEach(concept => {
                    ws.send(JSON.stringify({
                        type: 'conceptUpdate',
                        payload: {
                            concept: concept,
                            changeType: Math.random() > 0.9 ? 'removed' : Math.random() > 0.8 ? 'added' : 'updated'
                        }
                    }));
                });
            }
        }, 1500);

        // Send periodic notifications
        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && Math.random() > 0.9) { // 10% chance
                ws.send(JSON.stringify({
                    type: 'notification',
                    payload: {
                        type: Math.random() > 0.5 ? 'success' : 'info',
                        title: 'Demo Event',
                        message: ['Derivation complete', 'Priority updated', 'New concept formed', 'Reasoning step'][Math.floor(Math.random() * 4)],
                        timestamp: Date.now()
                    }
                }));
            }
        }, 4000);

    });

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'narseseInput') {
            console.log('Processing narsese input:', message.payload.input);
            if (ws.readyState === WebSocket.OPEN) {
                // Echo back as a task to show it was processed
                ws.send(JSON.stringify({
                    type: 'taskUpdate',
                    payload: {
                        id: 'echo_' + Date.now(),
                        content: message.payload.input,
                        priority: Math.random(),
                        creationTime: Date.now(),
                        type: message.payload.input.includes('?') ? 'question' : message.payload.input.includes('!') ? 'goal' : 'belief'
                    }
                }));
            }
        }
    });

    ws.on('close', () => {
        console.log('Demo automation disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error in automation:', error.message);
    });
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