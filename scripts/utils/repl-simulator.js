#!/usr/bin/env node

/**
 * SeNARS REPL Simulator
 * A realistic simulation of the actual REPL experience using WebSocket communication
 * Designed for testing and demonstration of end-to-end functionality
 */

import {spawn} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {WebSocket} from 'ws';
import {setTimeout as setTimeoutPromise} from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments for custom inputs
const args = process.argv.slice(2);
const customInputs = args.length > 0 ? args : null;

// Configuration
const config = {
    wsPort: process.env.WS_PORT || 8080,
    wsUrl: `ws://localhost:${process.env.WS_PORT || 8080}/ws`,
    defaultDemoSequence: [
        {type: 'input', text: '<robin --> animal>. %1.0;0.9%'},
        {type: 'input', text: '<robin --> [flying]>. %1.0;0.9%'},
        {type: 'step', count: 1},
        {type: 'input', text: '<swan --> animal>. %1.0;0.9%'},
        {type: 'input', text: '<swan --> [swimming]>. %1.0;0.9%'},
        {type: 'step', count: 1},
        {type: 'input', text: '<bird --> [flying]>. %0.9;0.8%'},
        {type: 'step', count: 2}
    ]
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
        this.allTasks = [];              // Store all tasks in order received

        // Extract just the core term from each input for comparison
        for (const input of originalInputs) {
            const termPart = input.split('%')[0].replace(/\.$/g, '').trim();
            this.originalInputTermsSet.add(cleanTermForComparison(termPart));
        }
    }

    /**
     * Check if a task is an original input
     */
    isOriginalInput(taskTerm) {
        // Get the term name from different possible formats
        const termString = typeof taskTerm === 'object' ?
            (taskTerm._name || taskTerm.toString()) :
            taskTerm;

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
        const term = taskData.term?._name || taskData.term || 'unknown';

        // Format the task with truth values
        let formattedTask = term;
        const truth = taskData.truth;
        if (truth && truth.frequency !== undefined && truth.confidence !== undefined) {
            formattedTask += ` %${truth.frequency.toFixed(1)};${truth.confidence.toFixed(1)}%`;
        }

        // Add to all tasks
        this.allTasks.push({
            term: taskData.term,
            truth: taskData.truth,
            priority: taskData.priority,
            occurrenceTime: taskData.occurrenceTime,
            formatted: formattedTask,
            type: taskData.type,
            occurrence: taskData.occurrence
        });

        // Only add if it's not an original input and it's unique
        if (!this.isOriginalInput(term) && !this.tasksReceived.has(term)) {
            this.tasksReceived.set(term, taskData);
            this.derivedTasks.add(formattedTask);
            if (process.env.DEBUG_TASKS) {
                console.log(`🔍 New derived task: ${formattedTask}`);
            }
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

    /**
     * Get all tasks in order received
     */
    getAllTasksInOrder() {
        return this.allTasks;
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

    static formatCommand(text) {
        return `\x1b[34m${text}\x1b[0m`; // Blue
    }

    static printSeparator() {
        console.log('─'.repeat(60));
    }

    static printReplIntro() {
        console.log(OutputFormatter.formatTitle('🎓 SeNARS REPL Simulator'));
        console.log(OutputFormatter.formatTitle('========================'));
        console.log('Simulating realistic REPL experience over WebSocket');
        OutputFormatter.printSeparator();
    }

    static printAction(action, details) {
        console.log(`${OutputFormatter.formatCommand(`🔄 ${action}`)} ${details || ''}`);
    }

    static printInput(input) {
        console.log(`${OutputFormatter.formatInput('📥 INPUT:')} ${input}`);
    }

    static printStep(count) {
        console.log(`${OutputFormatter.formatCommand(`⏭️  STEP:`)} Processing ${count} reasoning cycle${count > 1 ? 's' : ''}`);
    }

    static printResults(derivedTasks) {
        console.log();
        OutputFormatter.printSeparator();
        console.log(OutputFormatter.formatTitle('🏁 REPL Session Complete!'));
        OutputFormatter.printSeparator();

        // Show derived outputs
        console.log(OutputFormatter.formatSection('📤 DERIVED BELIEFS:'));
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

    static printCustomInputs(inputs) {
        console.log(`${OutputFormatter.formatSection('📋')} Custom inputs mode`);
    }
}

/**
 * REPLSession class to handle the actual REPL session simulation
 */
class REPLSession {
    constructor(sessionId = 'repl-demo') {
        this.sessionId = sessionId;
        this.config = config;
        this.taskManager = null;
        this.webSocket = null;
        this.isReady = false;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.webSocket = new WebSocket(`${this.config.wsUrl}?session=${this.sessionId}`);

            this.webSocket.on('open', () => {
                this.isReady = true;
                OutputFormatter.printAction('Connected', `to WebSocket server at ${this.config.wsUrl}`);
                resolve(this.webSocket);
            });

            this.webSocket.on('message', (data) => {
                try {
                    const message = JSON.parse(data);

                    // Process various types of messages the REPL would receive
                    if (message.type === 'event' && message.eventType === 'task.added') {
                        const taskData = message.data?.data?.task;
                        if (taskData && taskData.type === 'BELIEF') {
                            this.taskManager.addTask(taskData);
                        }
                    } else if (message.type === 'event' && message.eventType === 'task.processed') {
                        // Task processed event - useful for diagnostics
                        if (process.env.DEBUG_EVENTS) {
                            OutputFormatter.printAction('Task Processed', 'Event received');
                        }
                    } else if (message.type === 'event' && message.eventType === 'cycle.complete') {
                        // Cycle complete event - useful for diagnostics
                        if (process.env.DEBUG_EVENTS) {
                            OutputFormatter.printAction('Cycle Complete', 'Reasoning cycle finished');
                        }
                    } else if (message.type === 'event' && message.eventType === 'system.started') {
                        OutputFormatter.printAction('System Started', 'Reasoning engine initialized');
                    } else if (message.type === 'event' && message.eventType === 'system.stopped') {
                        OutputFormatter.printAction('System Stopped', 'Reasoning engine paused');
                    } else if (message.type === 'event' && message.eventType === 'reasoning.step') {
                        // Reasoning step event - useful for diagnostics
                        if (process.env.DEBUG_EVENTS) {
                            OutputFormatter.printAction('Reasoning Step', 'Step processing occurred');
                        }
                    }
                    // Handle direct output messages
                    else if (message.type === 'output' || message.type === 'reason/output') {
                        // These are direct output messages from the system
                        if (process.env.DEBUG_OUTPUT) {
                            OutputFormatter.printAction('Direct Output', JSON.stringify(message.payload));
                        }
                    }
                } catch (e) {
                    // Ignore non-JSON messages or parsing errors
                }
            });

            this.webSocket.on('error', (error) => {
                if (error.message && !error.message.includes('ECONNREFUSED')) {
                    console.error('📡 WebSocket error:', error.message);
                }
                reject(error);
            });

            this.webSocket.on('close', () => {
                this.isReady = false;
            });
        });
    }

    async waitForReady() {
        while (!this.isReady) {
            await wait(100);
        }
    }

    async sendInput(text) {
        if (!this.isReady || this.webSocket.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not ready');
        }

        const message = {sessionId: this.sessionId, type: 'reason/step', payload: {text}};
        this.webSocket.send(JSON.stringify(message));

        return Promise.resolve();
    }

    async sendStep(count = 1) {
        if (!this.isReady || this.webSocket.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not ready');
        }

        for (let i = 0; i < count; i++) {
            const message = {sessionId: this.sessionId, type: 'control/step', payload: {}};
            this.webSocket.send(JSON.stringify(message));
            if (i < count - 1) {
                await wait(50); // Small delay between steps
            }
        }

        return Promise.resolve();
    }

    close() {
        if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
            this.webSocket.close();
        }
    }
}

/**
 * REPLSimulator class to coordinate the entire simulation
 */
class REPLSimulator {
    constructor() {
        this.serverProcess = null;
        this.session = null;
        this.taskManager = null;
        this.config = config;
    }

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
                console.log('\n🛑 REPL simulation interrupted by user');
                this.cleanup();
                process.exit(0);
            });
        });
    }

    async runDemo(sequence = this.config.defaultDemoSequence) {
        OutputFormatter.printReplIntro();

        // Start server
        await this.startServer();
        await wait(300); // Minimal initialization wait

        // Initialize session
        this.session = new REPLSession('repl-demo');

        // Extract original inputs for task manager
        const originalInputs = sequence
            .filter(item => item.type === 'input')
            .map(item => item.text);

        // Initialize task manager
        this.taskManager = new TaskManager(originalInputs);

        // Connect to WebSocket
        await this.session.connect();
        await this.session.waitForReady();

        // Execute sequence
        for (const action of sequence) {
            if (action.type === 'input') {
                OutputFormatter.printInput(action.text);
                await this.session.sendInput(action.text);
                await wait(50);
            } else if (action.type === 'step') {
                OutputFormatter.printStep(action.count);
                await this.session.sendStep(action.count);
                await wait(action.count * 100); // Wait for processing
            }
        }

        // Close session
        this.session.close();

        // Show results
        OutputFormatter.printResults(this.taskManager.getDerivedTasks());

        // Cleanup
        this.cleanup();

        console.log(OutputFormatter.formatTitle('✅ REPL Simulation finished successfully!'));
    }

    async runCustomInputs(inputs) {
        OutputFormatter.printCustomInputs(inputs);

        // Convert inputs to sequence
        const sequence = [];
        for (const input of inputs) {
            sequence.push({type: 'input', text: input});
            sequence.push({type: 'step', count: 1});
        }

        await this.runDemo(sequence);
    }

    cleanup() {
        if (this.serverProcess) {
            this.serverProcess.kill();
        }
        if (this.session) {
            this.session.close();
        }
    }
}

/**
 * Main execution function
 */
async function main() {
    const simulator = new REPLSimulator();

    if (customInputs) {
        await simulator.runCustomInputs(customInputs);
    } else {
        await simulator.runDemo();
    }
}

// Run the simulator
main().catch(error => {
    console.error('❌ REPL Simulator failed:', error);
    process.exit(1);
});