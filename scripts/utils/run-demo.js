#!/usr/bin/env node

import {spawn} from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const DEMO_CONFIG = {
    WEBSOCKET_PORT: 8083,
    UI_PORT: 5176,
    DURATION: 60000, // 1 minute demo
    DEMONSTRATION_TYPES: [
        'priority-fluctuations',
        'derivations',
        'memory-dynamics',
        'reasoning-chains'
    ],
    STARTUP_DELAYS: {
        server: 4000,
        ui: 2000,
        automation: 5000
    },
    BASE_TERMS: ['cat', 'dog', 'bird', 'fish', 'animal', 'mammal', 'pet', 'living']
};

const updateMetricsFromMessage = (demoData, message) => {
    if (message.includes('derivation') || message.includes('reasoning')) {
        demoData.metrics.derivationsMade++;
    } else if (message.includes('priority')) {
        demoData.metrics.priorityChanges++;
    } else if (message.includes('task')) {
        demoData.metrics.tasksProcessed++;
    } else if (message.includes('connected')) {
        demoData.metrics.connections++;
    }
};

const logEvent = (demoData, source, message) => {
    demoData.events.push({
        timestamp: Date.now(),
        source,
        message,
        relativeTime: Date.now() - demoData.startTime
    });

    updateMetricsFromMessage(demoData, message);
};

const createAutomationScript = (webSocketPort) => `
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

const createProcessWithLogging = (spawnArgs, logPrefix, processes, demoData) => {
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
};

const setupDemoEnvironment = async () => {
    console.log('🚀 Setting up live demo environment...');

    const demoResultsDir = path.join(rootDir, 'demo-results');
    await fs.mkdir(demoResultsDir, {recursive: true});
    await fs.mkdir(path.join(demoResultsDir, 'logs'), {recursive: true});

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
};

const startWebSocketServer = async (demoData, processes) => {
    console.log(`🔌 Starting WebSocket server on port ${DEMO_CONFIG.WEBSOCKET_PORT}...`);

    createProcessWithLogging(
        ['node', ['scripts/ui/launcher.js', '--no-ui', '--ws-port', DEMO_CONFIG.WEBSOCKET_PORT.toString()], {
            env: {
                ...process.env,
                WS_PORT: DEMO_CONFIG.WEBSOCKET_PORT.toString(),
                WS_HOST: 'localhost'
            },
            cwd: rootDir,
            stdio: ['pipe', 'pipe', 'pipe']
        }],
        'SERVER',
        processes,
        demoData
    );

    await new Promise(resolve => setTimeout(resolve, DEMO_CONFIG.STARTUP_DELAYS.server));

    console.log('✅ WebSocket server started');
};

const startDemoUI = async (demoData, processes) => {
    console.log(`🖥️  Starting demo UI on port ${DEMO_CONFIG.UI_PORT}...`);

    createProcessWithLogging(
        ['node', ['server.js'], {
            env: {
                ...process.env,
                PORT: DEMO_CONFIG.UI_PORT.toString(),
                WS_PORT: DEMO_CONFIG.WEBSOCKET_PORT.toString(), // For UI to connect to backend
                BACKEND_WS_PORT: DEMO_CONFIG.WEBSOCKET_PORT.toString(), // Redundant but explicit
                BACKEND_WS_HOST: 'localhost'
            },
            cwd: path.join(rootDir, 'ui'),
            stdio: ['pipe', 'pipe', 'pipe']
        }],
        'UI',
        processes,
        demoData
    );

    await new Promise(resolve => setTimeout(resolve, DEMO_CONFIG.STARTUP_DELAYS.ui));

    console.log('✅ Demo UI started');
};

const startDemoAutomation = async (demoData, processes) => {
    console.log('🤖 Starting demo automation...');

    const automationScript = createAutomationScript(DEMO_CONFIG.WEBSOCKET_PORT);
    const automationPath = path.join(rootDir, 'demo-automation-tmp.js');
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
};

const generateDemoReport = async (demoData) => {
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

    const demoResultsDir = path.join(rootDir, 'demo-results');
    const reportPath = path.join(demoResultsDir, 'demo-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    const summaryPath = path.join(demoResultsDir, 'demo-summary.txt');
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
${demoData.events.slice(-20).map(e => '[' + new Date(e.timestamp).toLocaleTimeString() + '] ' + e.source + ': ' + e.message).join('\n')}
`;

    await fs.writeFile(summaryPath, summary);

    console.log(`\n📋 Demo report saved to: ${reportPath}`);
    console.log(`📋 Demo summary saved to: ${summaryPath}`);

    console.log(`\n🏆 Demo Results:`);
    console.log(`  • ${report.summary.tasksProcessed} tasks processed`);
    console.log(`  • ${report.summary.derivationsMade} derivations made`);
    console.log(`  • ${report.summary.priorityChanges} priority changes`);
    console.log(`  • ${report.summary.connections} connections`);
};

const cleanupDemo = async (processes) => {
    console.log('\n🔄 Cleaning up demo processes...');

    for (const process of processes) {
        if (!process.killed) {
            try {
                process.kill(); // SIGTERM
                // Wait briefly for it to die?
            } catch (e) {
                console.error('Error killing process:', e.message);
            }
        }
    }

    try {
        await fs.unlink(path.join(rootDir, 'demo-automation-tmp.js'));
    } catch (err) {
        // Ignore if file doesn't exist
    }

    console.log('✅ Cleanup completed');
};

(async () => {
    const processes = [];
    let demoData;

    const handleShutdown = async (signal) => {
        console.log(`\n⚠️  Received ${signal}, shutting down demo...`);
        await cleanupDemo(processes);
        process.exit(0);
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

    try {
        demoData = await setupDemoEnvironment();
        await startWebSocketServer(demoData, processes);
        await startDemoUI(demoData, processes);
        await startDemoAutomation(demoData, processes);

        console.log(`\n🎯 Demo is now running!`);
        console.log(`📡 WebSocket Server: ws://localhost:${DEMO_CONFIG.WEBSOCKET_PORT}`);
        console.log(`🌐 Demo UI: http://localhost:${DEMO_CONFIG.UI_PORT}`);
        console.log(`⏳ Demo duration: ${DEMO_CONFIG.DURATION / 1000} seconds`);
        console.log(`\n📋 Demonstrating:`);
        DEMO_CONFIG.DEMONSTRATION_TYPES.forEach(type => {
            console.log(`  • ${type.replace('-', ' ')}`);
        });

        await new Promise(resolve => setTimeout(resolve, DEMO_CONFIG.DURATION));

        console.log('\n📊 Generating demo report...');
        await generateDemoReport(demoData);

        const success = true;
        console.log(`\n🎉 Demo ${success ? 'COMPLETED SUCCESSFULLY' : 'FAILED'}`);
        await cleanupDemo(processes);
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ Demo error:', error);
        await cleanupDemo(processes);
        process.exit(1);
    }
})();
