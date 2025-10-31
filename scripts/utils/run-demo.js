#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Configuration for the live demo
const DEMO_CONFIG = {
    WEBSOCKET_PORT: 8083,  // Changed to avoid conflicts
    UI_PORT: 5176,         // Changed to avoid conflicts
    DURATION: 60000, // 1 minute demo
    DEMONSTRATION_TYPES: [
        'priority-fluctuations',
        'derivations',
        'memory-dynamics',
        'reasoning-chains'
    ]
};

class LiveDemoRunner {
    constructor() {
        this.processes = [];
        this.demoData = {
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

    async setup() {
        console.log('🚀 Setting up live demo environment...');
        
        // Clean up any existing processes  
        await this.cleanup();
        
        // Create demo results directory
        await fs.mkdir('demo-results', { recursive: true });
        await fs.mkdir('demo-results/logs', { recursive: true });
        
        console.log('✅ Demo environment ready');
    }

    async startWebSocketServer() {
        console.log(`🔌 Starting WebSocket server on port ${DEMO_CONFIG.WEBSOCKET_PORT}...`);
        
        const serverProcess = spawn('node', ['webui.js'], {
            env: {
                ...process.env,
                WS_PORT: DEMO_CONFIG.WEBSOCKET_PORT,
                WS_HOST: 'localhost',
                VITE_WS_PORT: DEMO_CONFIG.WEBSOCKET_PORT
            },
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[SERVER] ${output.trim()}`);
            this.logEvent('server', output.trim());
        });

        serverProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.error(`[SERVER ERROR] ${error}`);
        });

        this.processes.push(serverProcess);
        
        // Wait for server to start
        await this.delay(4000);
        
        console.log('✅ WebSocket server started');
    }

    async startDemoUI() {
        console.log(`🖥️  Starting demo UI on port ${DEMO_CONFIG.UI_PORT}...`);
        
        const uiProcess = spawn('npx', ['vite', '-c', 'simple-uis/vite.config.js'], {
            env: {
                ...process.env, 
                PORT: DEMO_CONFIG.UI_PORT,
                VITE_WS_PORT: DEMO_CONFIG.WEBSOCKET_PORT,
                VITE_WS_HOST: 'localhost'
            },
            cwd: path.join(process.cwd(), 'ui'),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        uiProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[UI] ${output.trim()}`);
            this.logEvent('ui', output.trim());
        });

        uiProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.error(`[UI ERROR] ${error}`);
        });

        this.processes.push(uiProcess);
        
        // Wait for UI to start
        await this.delay(5000);
        
        console.log('✅ Demo UI started');
    }

    async startDemoAutomation() {
        console.log('🤖 Starting demo automation...');
        
        // Create a WebSocket client to simulate activity
        const automationScript = `
// Use a dynamic import to load the WebSocket library
async function runDemoAutomation() {
    // Add a small delay to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
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
        ws = await connectWithRetry('ws://localhost:${DEMO_CONFIG.WEBSOCKET_PORT}/ws');
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
                            input: \`<\${term1} --> \${term2}>.\`,
                            output: \`<\${term2} --> \${term1}>?\`,
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

        const automationPath = path.join(process.cwd(), 'demo-automation-tmp.js');
        await fs.writeFile(automationPath, automationScript);
        
        const automationProcess = spawn('node', [automationPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        automationProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[AUTOMATION] ${output.trim()}`);
            this.logEvent('automation', output.trim());
        });

        automationProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.error(`[AUTOMATION ERROR] ${error}`);
        });

        this.processes.push(automationProcess);
        
        console.log('✅ Demo automation started');
    }

    logEvent(source, message) {
        this.demoData.events.push({
            timestamp: Date.now(),
            source,
            message,
            relativeTime: Date.now() - this.demoData.startTime
        });
        
        // Update metrics based on message content
        if (message.includes('derivation') || message.includes('reasoning')) {
            this.demoData.metrics.derivationsMade++;
        }
        if (message.includes('priority')) {
            this.demoData.metrics.priorityChanges++;
        }
        if (message.includes('task')) {
            this.demoData.metrics.tasksProcessed++;
        }
        if (message.includes('connected')) {
            this.demoData.metrics.connections++;
        }
    }

    async runDemo() {
        console.log(`\n🎬 Starting live demo for ${DEMO_CONFIG.DURATION / 1000}s...`);
        
        try {
            await this.setup();
            await this.startWebSocketServer();
            await this.startDemoUI();
            await this.startDemoAutomation();
            
            console.log(`\n🎯 Demo is now running!`);
            console.log(`📡 WebSocket Server: ws://localhost:${DEMO_CONFIG.WEBSOCKET_PORT}`);
            console.log(`🌐 Demo UI: http://localhost:${DEMO_CONFIG.UI_PORT}`);
            console.log(`⏳ Demo duration: ${DEMO_CONFIG.DURATION / 1000} seconds`);
            console.log(`\n📋 Demonstrating:`);
            DEMO_CONFIG.DEMONSTRATION_TYPES.forEach(type => {
                console.log(`  • ${type.replace('-', ' ')}`);
            });
            
            // Wait for demo to complete
            await this.delay(DEMO_CONFIG.DURATION);
            
            console.log('\n📊 Generating demo report...');
            await this.generateDemoReport();
            
            return true;
        } catch (error) {
            console.error('❌ Demo error:', error);
            return false;
        }
    }

    async generateDemoReport() {
        const report = {
            ...this.demoData,
            endTime: Date.now(),
            duration: Date.now() - this.demoData.startTime,
            summary: {
                totalEvents: this.demoData.events.length,
                tasksProcessed: this.demoData.metrics.tasksProcessed,
                derivationsMade: this.demoData.metrics.derivationsMade,
                priorityChanges: this.demoData.metrics.priorityChanges,
                connections: this.demoData.metrics.connections
            }
        };

        const reportPath = path.join(process.cwd(), 'demo-results', 'demo-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        // Create a summary text file
        const summaryPath = path.join(process.cwd(), 'demo-results', 'demo-summary.txt');
        const summary = `LIVE DEMO SUMMARY
================
Start Time: ${new Date(this.demoData.startTime).toISOString()}
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
${this.demoData.events.slice(-20).map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.source}: ${e.message}`).join('\n')}
`;

        await fs.writeFile(summaryPath, summary);
        
        console.log(`\n📋 Demo report saved to: ${reportPath}`);
        console.log(`📋 Demo summary saved to: ${summaryPath}`);
        
        // Show key metrics
        console.log(`\n🏆 Demo Results:`);
        console.log(`  • ${report.summary.tasksProcessed} tasks processed`);
        console.log(`  • ${report.summary.derivationsMade} derivations made`);
        console.log(`  • ${report.summary.priorityChanges} priority changes`);
        console.log(`  • ${report.summary.connections} connections`);
    }

    async cleanup() {
        console.log('\n🔄 Cleaning up demo processes...');
        
        // Kill all processes
        this.processes.forEach(process => {
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

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the demo
async function runDemo() {
    const runner = new LiveDemoRunner();
    
    try {
        const success = await runner.runDemo();
        console.log(`\n🎉 Demo ${success ? 'COMPLETED SUCCESSFULLY' : 'FAILED'}`);
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('Demo execution error:', error);
        process.exit(1);
    } finally {
        await runner.cleanup();
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⚠️  Received SIGINT, shutting down demo...');
    // Cleanup will run automatically when process exits
    process.exit(0);
});

// Execute
runDemo();