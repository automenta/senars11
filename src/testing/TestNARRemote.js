/**
 * @file TestNARRemote.js
 * @description Test framework for NAR functionality using WebSocket pathway
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocket } from 'ws';
import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { RemoteTaskMatch } from './TaskMatch.js';

// Also export RemoteTaskMatch to maintain consistency for users who might reference it directly
export { RemoteTaskMatch };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * WebSocket client for remote NAR testing
 */
class WebSocketNARClient {
    constructor(port = 8080, sessionId = 'test') {
        this.port = port;
        this.sessionId = sessionId;
        this.ws = null;
        this.isReady = false;
        this.taskQueue = [];
        this.messageCallbacks = new Map();
        this.url = `ws://localhost:${this.port}/ws?session=${this.sessionId}`;
        this.disconnected = false; // Track disconnection state
    }

    async connect() {
        return new Promise((resolve, reject) => {
            // Set a timeout to avoid hanging indefinitely
            const timeout = setTimeout(() => {
                this._cleanupOnError('Connection timeout');
                reject(new Error('WebSocket connection timeout'));
            }, 10000); // 10 second timeout

            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                this.isReady = true;
                clearTimeout(timeout);
                console.log(`WebSocket client connected to ${this.url}`);
                resolve();
            });

            this.ws.on('message', (data) => {
                if (this.disconnected) return; // Don't process if disconnected
                try {
                    const message = JSON.parse(data);
                    this._handleMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket client error:', error);
                clearTimeout(timeout);
                this._cleanupOnError(error);
                if (!this.isReady) reject(error);
            });

            this.ws.on('close', () => {
                this.isReady = false;
                this.disconnected = true;
                clearTimeout(timeout);
                console.log('WebSocket client disconnected');
            });
        });
    }

    _cleanupOnError(error) {
        if (this.ws) {
            try {
                this.ws.close();
            } catch (closeError) {
                // Ignore close errors
            }
        }
        this.isReady = false;
        this.disconnected = true;
    }

    _handleMessage(message) {
        // Handle task.added events for expectations
        if (message.type === 'event' && message.eventType === 'task.added') {
            const taskData = message.data?.data?.task || message.data?.task;
            if (taskData) {
                this._processTaskAdded(taskData);
            }
        }
        // Handle task.processed events for additional tracking
        else if (message.type === 'event' && message.eventType === 'task.processed') {
            const taskData = message.data?.data?.task || message.data?.task;
            if (taskData) {
                this._processTaskAdded(taskData);
            }
        }
        // Handle other event types
        else if (message.type === 'event') {
            // Emit for any registered callbacks
            const callbacks = this.messageCallbacks.get(message.eventType) || [];
            callbacks.forEach(callback => callback(message));
        }
        // Handle direct output messages that the REPL might receive
        else if (message.type === 'output' || message.type === 'reason/output' || message.type === 'task.added' || message.type === 'task.processed') {
            // These are direct output messages from the system
            // Process them if needed
            if ((message.type === 'task.added' || message.type === 'task.processed') && message.data) {
                this._processTaskAdded(message.data);
            }
        }
    }

    _processTaskAdded(taskData) {
        this.taskQueue.push(taskData);
    }

    async sendNarsese(narseseString) {
        if (!this.isReady || this.ws?.readyState !== WebSocket.OPEN || this.disconnected) {
            throw new Error('WebSocket is not ready');
        }

        return new Promise((resolve, reject) => {
            const message = {
                sessionId: this.sessionId,
                type: 'reason/step',
                payload: { text: narseseString }
            };

            // Set timeout to avoid hanging
            const timeout = setTimeout(() => {
                reject(new Error('sendNarsese timeout'));
            }, 5000);

            try {
                this.ws.send(JSON.stringify(message), (error) => {
                    clearTimeout(timeout);
                    if (error) {
                        console.error('Error sending Narsese:', error);
                        reject(error);
                    } else {
                        resolve({ success: true, message: 'Narsese sent successfully' });
                    }
                });
            } catch (error) {
                clearTimeout(timeout);
                console.error('Error sending Narsese:', error);
                reject(error);
            }
        });
    }

    async sendControlCommand(command) {
        if (!this.isReady || this.ws?.readyState !== WebSocket.OPEN || this.disconnected) {
            throw new Error('WebSocket is not ready');
        }

        return new Promise((resolve, reject) => {
            const message = {
                sessionId: this.sessionId,
                type: `control/${command}`,
                payload: {}
            };

            // Set timeout to avoid hanging
            const timeout = setTimeout(() => {
                reject(new Error('sendControlCommand timeout'));
            }, 5000);

            try {
                this.ws.send(JSON.stringify(message), (error) => {
                    clearTimeout(timeout);
                    if (error) {
                        console.error('Error sending control command:', error);
                        reject(error);
                    } else {
                        resolve({ success: true, message: `Control command ${command} sent` });
                    }
                });
            } catch (error) {
                clearTimeout(timeout);
                console.error('Error sending control command:', error);
                reject(error);
            }
        });
    }

    registerCallback(eventType, callback) {
        if (!this.messageCallbacks.has(eventType)) {
            this.messageCallbacks.set(eventType, []);
        }
        this.messageCallbacks.get(eventType).push(callback);
    }

    async disconnect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.disconnected) {
            this.disconnected = true;
            this.ws.close();
        }
        this.isReady = false;
    }

    async isReadyForUse() {
        return this.isReady && this.ws?.readyState === WebSocket.OPEN && !this.disconnected;
    }
}

/**
 * NAR Server Manager for running embedded server during tests
 */
class NARServerManager {
    constructor(port = 8080) {
        this.port = port;
        this.serverProcess = null;
        this.serverReady = false;
        this.disconnected = false;
    }

    async start() {
        return new Promise((resolve, reject) => {
            // Set timeout to avoid hanging indefinitely
            const timeout = setTimeout(() => {
                this.disconnected = true;
                if (this.serverProcess) this.serverProcess.kill();
                reject(new Error('NAR Server failed to start within timeout'));
            }, 15000); // 15 seconds timeout

            // Spawn the main NAR server process
            this.serverProcess = spawn('node', [join(__dirname, '../index.js')], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    WS_PORT: this.port.toString(),
                    NODE_ENV: 'test'
                }
            });

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('WebSocket monitoring server started')) {
                    this.serverReady = true;
                    clearTimeout(timeout);
                    console.log('NAR Server started and ready');
                    resolve();
                }
                // Log server output for debugging
                if (process.env.DEBUG_SERVER) {
                    console.log('SERVER STDOUT:', output);
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                const error = data.toString();
                if (error.includes('error') || error.includes('Error')) {
                    console.error('SERVER ERROR:', error);
                }
                // Log server errors for debugging
                if (process.env.DEBUG_SERVER) {
                    console.log('SERVER STDERR:', error);
                }
            });

            this.serverProcess.on('error', (error) => {
                console.error('Failed to start NAR server:', error);
                clearTimeout(timeout);
                this.disconnected = true;
                reject(error);
            });

            this.serverProcess.on('close', (code) => {
                console.log(`NAR server process exited with code ${code}`);
                clearTimeout(timeout);
                this.serverReady = false;
                this.disconnected = true;
            });
        });
    }

    async stop() {
        if (this.serverProcess && !this.disconnected) {
            this.disconnected = true;
            // Send SIGTERM first to allow graceful shutdown
            this.serverProcess.kill('SIGTERM');
            // Wait a bit for graceful shutdown, then force kill if needed
            await setTimeoutPromise(1000);
            if (!this.serverProcess.killed) {
                this.serverProcess.kill('SIGKILL');
            }
            this.serverReady = false;
        }
    }

    isRunning() {
        return this.serverReady && this.serverProcess && !this.serverProcess.killed && !this.disconnected;
    }
}

/**
 * Remote NAR Test Framework using WebSocket pathway
 */
export class TestNARRemote {
    constructor(trace = false) {
        this.operations = [];
        this.narServer = null;
        this.client = null;
        this.trace = trace;
        this.eventLog = [];
        this.port = 8081 + Math.floor(Math.random() * 100); // Random port to avoid conflicts
        this.executionTimeout = 30000; // 30 second timeout for entire execution
    }

    static _matchesTruth(taskTruth, criteriaTruth) {
        if (!taskTruth) return false;
        return (!criteriaTruth.minFreq || taskTruth.frequency >= criteriaTruth.minFreq) &&
            (!criteriaTruth.minConf || taskTruth.confidence >= criteriaTruth.minConf);
    }

    getNAR() {
        // Return the client as a proxy to the remote NAR
        return this.client;
    }

    input(termStr, freq = 0.9, conf = 0.9) {
        this.operations.push({type: 'input', termStr, freq, conf});
        return this;
    }

    run(cycles = 1) {
        this.operations.push({type: 'run', cycles});
        return this;
    }

    expect(termStr) {
        // If termStr is already a RemoteTaskMatch instance, use it directly
        // Otherwise, create a new RemoteTaskMatch with the provided term string
        const matcher = termStr instanceof RemoteTaskMatch ? termStr : new RemoteTaskMatch(termStr);
        this.operations.push({type: 'expect', matcher, shouldExist: true});
        return this;
    }

    expectNot(termStr) {
        // If termStr is already a RemoteTaskMatch instance, use it directly
        // Otherwise, create a new RemoteTaskMatch with the provided term string
        const matcher = termStr instanceof RemoteTaskMatch ? termStr : new RemoteTaskMatch(termStr);
        this.operations.push({type: 'expect', matcher, shouldExist: false});
        return this;
    }
    
    // Provide convenience methods similar to TestNAR
    expectWithPunct(termStr, punct) {
        return this.expect(new RemoteTaskMatch(termStr).withPunctuation(punct));
    }
    
    expectWithTruth(termStr, minFreq, minConf) {
        return this.expect(new RemoteTaskMatch(termStr).withTruth(minFreq, minConf));
    }
    
    expectWithFlexibleTruth(termStr, expectedFreq, expectedConf, tolerance) {
        return this.expect(new RemoteTaskMatch(termStr).withFlexibleTruth(expectedFreq, expectedConf, tolerance));
    }

    async setup() {
        // Start the NAR server
        this.narServer = new NARServerManager(this.port);
        await this.narServer.start();

        // Wait a bit for the server to be completely ready
        await setTimeoutPromise(500);

        // Connect the WebSocket client
        this.client = new WebSocketNARClient(this.port, 'test');
        await this.client.connect();

        // Wait a bit more for the client to be ready
        await setTimeoutPromise(200);
    }

    async teardown() {
        try {
            // Disconnect client first
            if (this.client) {
                await this.client.disconnect();
            }
        } catch (error) {
            console.warn('Error disconnecting client:', error);
        }

        try {
            // Stop the server
            if (this.narServer) {
                await this.narServer.stop();
            }
        } catch (error) {
            console.warn('Error stopping server:', error);
        }
    }

    async execute() {
        // Set up timeout for entire execution to avoid hanging
        const executePromise = this._executeCore();
        const timeoutPromise = setTimeoutPromise(this.executionTimeout).then(() => {
            throw new Error(`TestNARRemote execution timed out after ${this.executionTimeout}ms`);
        });

        try {
            return await Promise.race([
                executePromise,
                timeoutPromise
            ]);
        } catch (error) {
            // Ensure cleanup happens even if timeout occurs
            await this.teardown().catch(console.warn);
            throw error;
        }
    }

    async _executeCore() {
        await this.setup();

        try {
            // Process operations
            const expectations = [];

            for (const op of this.operations) {
                switch (op.type) {
                    case 'input':
                        try {
                            // Format input with truth values: "term. %freq;conf%"
                            const inputStr = `${op.termStr}. %${op.freq};${op.conf}%`;
                            await this.client.sendNarsese(inputStr);
                            
                            // Small delay to allow processing
                            await setTimeoutPromise(50);
                        } catch (error) {
                            console.warn(`Input failed: ${op.termStr}`, error);
                        }
                        break;

                    case 'run':
                        // Send control step commands to run cycles
                        for (let i = 0; i < op.cycles; i++) {
                            await this.client.sendControlCommand('step');
                            await setTimeoutPromise(20); // Small delay between steps
                        }
                        break;

                    case 'expect':
                        expectations.push(op);
                        break;
                }
            }

            // Additional steps to allow for inference
            for (let i = 0; i < 50; i++) {  // Increased steps like TestNAR
                await this.client.sendControlCommand('step');
                await setTimeoutPromise(10); // Small delay between steps
            }

            // Wait for all derived tasks to be received
            await setTimeoutPromise(2000); // Increased wait for processing like TestNAR

            // Get all received tasks for validation
            const allTasks = [...this.client.taskQueue]; // Get a copy of all received tasks

            // Remove duplicates based on term and truth values to handle multiple events for same task
            const uniqueTasks = [];
            const seen = new Set();

            for (const task of allTasks) {
                const key = (task.term?._name || task.term || 'unknown') + 
                           (task.truth?.frequency || task.truth?.f || 0) + 
                           (task.truth?.confidence || task.truth?.c || 0);
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueTasks.push(task);
                }
            }

            // Validate expectations
            for (const exp of expectations) {
                const {matcher, shouldExist} = exp;

                let found = false;
                for (const task of uniqueTasks) {
                    if (await matcher.matches(task)) {
                        found = true;
                        break;
                    }
                }

                if ((shouldExist && !found) || (!shouldExist && found)) {
                    const taskList = uniqueTasks.length
                        ? uniqueTasks.map(t => `  - ${this._formatTask(t)}`).join('\n')
                        : '  (None)';

                    throw new Error(`
          ==================== TEST FAILED ====================
          Expectation: ${shouldExist ? 'FIND' : 'NOT FIND'} a task matching criteria.
          Criteria: Term="${matcher.termFilter}", MinFreq="${matcher.minFreq}", MinConf="${matcher.minConf}"

          ----- All Tasks (${uniqueTasks.length}) -----
${taskList}
          ---------------------------------------------------
        `);
                }
            }

            return true;
        } finally {
            await this.teardown();
        }
    }

    _formatTask(task) {
        const term = task.term?._name || task.term || 'unknown';
        const truth = task.truth;
        if (truth && typeof truth.frequency !== 'undefined' && typeof truth.confidence !== 'undefined') {
            return `${term} %${parseFloat(truth.frequency || truth.f).toFixed(1)};${parseFloat(truth.confidence || truth.c).toFixed(1)}%`;
        }
        return term;
    }
}