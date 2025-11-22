#!/usr/bin/env node

/**
 * SeNARS Generic Demo Runner
 * WebSocket-based demonstration runner that can execute any set of Narsese inputs
 * Shows end-to-end functionality with all system activity
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocket } from 'ws';
import { setTimeout as setTimeoutPromise } from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments for custom inputs
const args = process.argv.slice(2);
const customInputs = args.length > 0 ? args : null;

// Demo configuration
const config = {
    wsPort: process.env.WS_PORT || 8080,
    wsUrl: `ws://localhost:${process.env.WS_PORT || 8080}/ws`,
    defaultInputs: [
        '<a ==> b>. %1.0;0.9%',
        '<b ==> c>. %1.0;0.9%'
    ],
    stepsToRun: 5 // Number of reasoning steps to execute to ensure derivations
};

/**
 * Helper function to wait for a specific time
 */
const wait = (ms) => setTimeoutPromise(ms);

/**
 * Clean term for comparison with original inputs
 * This function normalizes both input format (<a ==> b>) and internal format ((==>, a, b))
 * to a common representation for comparison purposes
 */
const cleanTermForComparison = (term) => {
    // First, remove syntax characters and normalize operators
    let cleaned = term
        .replace(/[<>.,()]/g, ' ')  // Replace syntax characters with spaces
        .replace(/-->/g, '==> ')    // Normalize implication operator
        .replace(/\s+/g, ' ')       // Normalize multiple spaces
        .trim();
    
    // Split by spaces and filter out operators and empty strings, then rejoin
    return cleaned
        .split(' ')
        .filter(part => part && part !== '==>' && part !== '') // Remove operators and empty parts
        .sort()                     // Sort to handle different argument orders
        .join(' ');                 // Join back together
};

/**
 * TaskManager class to handle task tracking and filtering
 */
class TaskManager {
    constructor(originalInputs = []) {
        this.originalInputTermsSet = new Set();
        this.tasksReceived = new Map();  // All task.added events (for deduplication)
        this.derivedTasks = new Set();   // Derived output tasks (excluding original inputs)
        
        // Extract just the core term from each input for comparison
        for (const input of originalInputs) {
            const termPart = input.split('%')[0].replace(/[<>()]/g, '').replace(/\.$/g, '').trim();
            this.originalInputTermsSet.add(cleanTermForComparison(termPart));
        }
    }
    
    /**
     * Check if a task is an original input
     */
    isOriginalInput(taskTerm) {
        // Handle both string and object terms
        const termString = typeof taskTerm === 'object' && taskTerm._name ? 
            taskTerm._name : 
            (typeof taskTerm === 'object' ? String(taskTerm) : taskTerm);
        
        const cleanTaskTerm = cleanTermForComparison(termString);
        
        for (const originalTerm of this.originalInputTermsSet) {
            // Check for exact match or near-exact match after cleaning both
            if (cleanTaskTerm === originalTerm || 
                cleanTaskTerm.includes(originalTerm) || 
                originalTerm.includes(cleanTaskTerm)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Add a task to tracking if it's new and not an original input
     */
    addTask(taskData) {
        if (!taskData) {
            return false;
        }
        
        const term = taskData.term?._name || taskData.term || 'unknown';
        
        // Format the task with truth values
        let formattedTask = term;
        const truth = taskData.truth;
        if (truth && typeof truth.frequency !== 'undefined' && typeof truth.confidence !== 'undefined') {
            formattedTask += ` %${parseFloat(truth.frequency).toFixed(1)};${parseFloat(truth.confidence).toFixed(1)}%`;
        }
        
        // Use the same term for comparison as we use for storage
        const termForComparison = term;
        
        // Only add if it's not an original input and it's unique
        if (!this.isOriginalInput(termForComparison) && !this.tasksReceived.has(termForComparison)) {
            this.tasksReceived.set(termForComparison, taskData);
            this.derivedTasks.add(formattedTask);
            return true;
        }
        return false;
    }
    
    /**
     * Get derived tasks
     */
    getDerivedTasks() {
        return Array.from(this.derivedTasks);
    }
    
    /**
     * Get all tracked tasks
     */
    getAllTasks() {
        return this.tasksReceived;
    }
}

/**
 * WebSocketManager class to handle WebSocket communication
 */
class WebSocketManager {
    constructor(config, taskManager) {
        this.config = config;
        this.taskManager = taskManager;
        this.ws = null;
        this.isReady = false;
    }
    
    async connect(sessionId = 'demo') {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`${this.config.wsUrl}?session=${sessionId}`);
            
            this.ws.on('open', () => {
                this.isReady = true;
                resolve(this.ws);
            });
            
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    
                    // Process task.added events (beliefs only)
                    if (message.type === 'event' && message.eventType === 'task.added') {
                        const taskData = message.data?.data?.task || message.data?.task;
                        if (taskData && (taskData.type === 'BELIEF' || taskData.type === 'GOAL')) {
                            this.taskManager.addTask(taskData);
                        }
                    }
                    // Also handle other events that the REPL would receive
                    else if (message.type === 'event' && message.eventType === 'task.processed') {
                        // This event occurs when a task has been processed
                        // For demo purposes, we just track it if needed
                    }
                    else if (message.type === 'event' && message.eventType === 'cycle.complete') {
                        // This event occurs when a reasoning cycle is complete
                        // For demo purposes, we just acknowledge it
                    }
                    // Handle direct output messages that the REPL might receive
                    else if (message.type === 'output' || message.type === 'reason/output' || message.type === 'task.added' || message.type === 'task.processed') {
                        // These are direct output messages from the system
                        // Process them if needed
                        if (message.type === 'task.added' && message.data) {
                            this.taskManager.addTask(message.data);
                        }
                    }
                } catch (e) {
                    // Ignore non-JSON messages or parsing errors
                }
            });
            
            this.ws.on('error', (error) => {
                if (error.message && !error.message.includes('ECONNREFUSED')) {
                    console.error('📡 WebSocket error:', error.message);
                }
                reject(error);
            });
            
            this.ws.on('close', () => {
                this.isReady = false;
            });
        });
    }
    
    /**
     * Send a message through the WebSocket
     */
    sendMessage(sessionId, type, payload) {
        return new Promise((resolve, reject) => {
            if (!this.isReady || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket is not ready'));
                return;
            }
            
            const message = { sessionId, type, payload };
            try {
                this.ws.send(JSON.stringify(message));
                resolve();
            } catch (error) {
                console.error('Error sending message:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Close the WebSocket connection
     */
    close() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
    }
    
    /**
     * Wait for WebSocket to be ready
     */
    async waitForReady() {
        while (!this.isReady) {
            await wait(100);
        }
    }
}

/**
 * OutputFormatter class to handle display formatting
 */
class OutputFormatter {
    static formatTitle(text) {
        return `\x1b[36m${text}\x1b[0m`; // Cyan
    }
    
    static formatInput(text) {
        return `\x1b[32m${text}\x1b[0m`; // Green
    }
    
    static formatOutput(text) {
        return `\x1b[33m${text}\x1b[0m`; // Yellow
    }
    
    static formatSection(text) {
        return `\x1b[35m${text}\x1b[0m`; // Magenta
    }
    
    static formatStatus(text) {
        return `\x1b[37m${text}\x1b[0m`; // White
    }
    
    static printSeparator() {
        console.log('─'.repeat(50));
    }
    
    static printDemoStart() {
        console.log(OutputFormatter.formatTitle('🎓 SeNARS Generic Demo Runner'));
        OutputFormatter.printSeparator();
        console.log(`${OutputFormatter.formatSection('📋')} Processing inputs...`);
        console.log();
    }
    
    static printDemoStartBrief(count) {
        console.log(OutputFormatter.formatTitle('🎓 SeNARS Generic Demo Runner'));
        OutputFormatter.printSeparator();
        console.log(`${OutputFormatter.formatSection('📋')} Running ${count} input(s)...`);
        console.log();
    }
    
    static printDemoResults(demoInputs, derivedTasks) {
        console.log(OutputFormatter.formatTitle('🏁 Demo completed!'));
        OutputFormatter.printSeparator();
        
        // Show original inputs
        console.log(OutputFormatter.formatSection('📥 INPUTS:'));
        demoInputs.forEach((input, i) => {
            console.log(`  ${i+1}. ${input}`);
        });
        
        // Show derived outputs
        console.log();
        console.log(OutputFormatter.formatSection('📤 DERIVED OUTPUTS:'));
        if (derivedTasks.length > 0) {
            let derivedIndex = 1;
            for (const task of derivedTasks) {
                console.log(`  ${derivedIndex++}. ${OutputFormatter.formatOutput(task)}`);
            }
        } else {
            console.log(`  ${OutputFormatter.formatStatus('No new derivations generated.')}`);
        }
        
        console.log();
        console.log(`${OutputFormatter.formatStatus('🔌')} Server shutting down...`);
    }
    
    static printSuccess() {
        console.log(OutputFormatter.formatTitle('✅ End-to-End Demo finished successfully!'));
    }
    
    static printCustomInputs(inputs) {
        console.log(`${OutputFormatter.formatSection('📋')} Custom inputs mode`);
    }
}

/**
 * SeNARSDemoRunner class to coordinate the demo execution
 */
class SeNARSDemoRunner {
    constructor() {
        this.serverProcess = null;
        this.taskManager = null;
        this.webSocketManager = null;
        this.config = config;
    }
    
    /**
     * Start the SeNARS server process
     */
    async startServer() {
        return new Promise((resolve) => {
            this.serverProcess = spawn('node', [join(__dirname, '../../src/index.js')], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    WS_PORT: this.config.wsPort,
                    NODE_ENV: 'development'
                }
            });

            let serverReady = false;
            
            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('WebSocket monitoring server started')) {
                    serverReady = true;
                }
            });
            
            this.serverProcess.stderr.on('data', (data) => {
                const error = data.toString();
                if (error.includes('error') || error.includes('Error')) {
                    console.error('❌ Server error:', error);
                }
            });
            
            // Wait for the server to be ready
            (async () => {
                while (!serverReady) {
                    await wait(100);
                }
                resolve();
            })();
            
            // Handle process termination
            process.on('SIGINT', () => {
                console.log('\n🛑 Demo interrupted by user');
                this.cleanup();
                process.exit(0);
            });
        });
    }
    
    /**
     * Run the demo with given inputs
     */
    async runDemo(demoInputs = this.config.defaultInputs) {
        // Initialize task manager
        this.taskManager = new TaskManager(demoInputs);
        
        // Start server
        await this.startServer();
        await wait(300); // Minimal initialization wait
        
        // Initialize WebSocket manager
        this.webSocketManager = new WebSocketManager(this.config, this.taskManager);
        await this.webSocketManager.connect('demo');
        await this.webSocketManager.waitForReady();
        
        // Display start info
        OutputFormatter.printDemoStart();
        
        // Send all inputs
        for (let i = 0; i < demoInputs.length; i++) {
            try {
                await this.webSocketManager.sendMessage('demo', 'reason/step', { text: demoInputs[i] });
            } catch (error) {
                console.error(`Failed to send input ${i+1}:`, error.message);
            }
            await wait(100); // Minimal wait between inputs
        }
        
        // Brief pause to let inputs be processed into the system
        await wait(300);
        
        // Run the configured number of reasoning cycles
        for (let step = 0; step < this.config.stepsToRun; step++) {
            try {
                await this.webSocketManager.sendMessage('demo', 'control/step', {});
            } catch (error) {
                console.error(`Failed to run reasoning step ${step+1}:`, error.message);
            }
            // No output during processing to keep display clean
        }
        
        await wait(500); // Allow final processing time
        
        // Close connections
        this.webSocketManager.close();
        
        // Generate and display output
        OutputFormatter.printDemoResults(demoInputs, this.taskManager.getDerivedTasks());
        
        // Kill server process
        this.cleanup();
        
        OutputFormatter.printSuccess();
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        if (this.serverProcess) {
            this.serverProcess.kill();
        }
        if (this.webSocketManager) {
            this.webSocketManager.close();
        }
    }
}

/**
 * Main execution function
 */
async function main() {
    const runner = new SeNARSDemoRunner();
    
    if (customInputs) {
        OutputFormatter.printCustomInputs(customInputs);
        try {
            await runner.runDemo(customInputs);
        } catch (error) {
            console.error('❌ Demo failed:', error);
            process.exit(1);
        }
    } else {
        try {
            await runner.runDemo();
        } catch (error) {
            console.error('❌ Demo failed:', error);
            process.exit(1);
        }
    }
}

// Run the demo
main().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
});
