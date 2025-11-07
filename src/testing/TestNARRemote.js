/**
 * @file TestNARRemote.js
 * @description Test framework for NAR functionality using WebSocket pathway
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocket } from 'ws';
import { setTimeout as setTimeoutPromise } from 'timers/promises';

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
        this.currentTaskResolver = null;
        this.messageCallbacks = new Map();
        this.url = `ws://localhost:${this.port}/ws?session=${this.sessionId}`;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                this.isReady = true;
                console.log(`WebSocket client connected to ${this.url}`);
                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this._handleMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket client error:', error);
                reject(error);
            });

            this.ws.on('close', () => {
                this.isReady = false;
                console.log('WebSocket client disconnected');
            });
        });
    }

    _handleMessage(message) {
        // Handle task.added events for expectations
        if (message.type === 'event' && message.eventType === 'task.added') {
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
        // Handle direct response messages
        else if (message.type === 'narseseInput' || message.type === 'control/ack') {
            if (this.currentTaskResolver) {
                this.currentTaskResolver(message);
                this.currentTaskResolver = null;
            }
        }
    }

    _processTaskAdded(taskData) {
        this.taskQueue.push(taskData);
        
        // If there's a pending expectation check, resolve it
        if (this.currentTaskResolver) {
            this.currentTaskResolver(taskData);
            this.currentTaskResolver = null;
        }
    }

    async sendNarsese(narseseString) {
        if (!this.isReady || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not ready');
        }

        return new Promise((resolve, reject) => {
            const message = {
                sessionId: this.sessionId,
                type: 'reason/step',
                payload: { text: narseseString }
            };

            try {
                this.ws.send(JSON.stringify(message));
                resolve({ success: true, message: 'Narsese sent successfully' });
            } catch (error) {
                console.error('Error sending Narsese:', error);
                reject(error);
            }
        });
    }

    async sendControlCommand(command) {
        if (!this.isReady || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not ready');
        }

        return new Promise((resolve, reject) => {
            const message = {
                sessionId: this.sessionId,
                type: `control/${command}`,
                payload: {}
            };

            try {
                this.ws.send(JSON.stringify(message));
                resolve({ success: true, message: `Control command ${command} sent` });
            } catch (error) {
                console.error('Error sending control command:', error);
                reject(error);
            }
        });
    }

    async waitForTask(timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            // If there are tasks in the queue already, return the first one
            if (this.taskQueue.length > 0) {
                const task = this.taskQueue.shift();
                resolve(task);
                return;
            }

            // Otherwise, wait for a task to arrive
            this.currentTaskResolver = resolve;
            
            // Set a timeout
            setTimeout(() => {
                if (this.currentTaskResolver === resolve) {
                    this.currentTaskResolver = null;
                    resolve(null); // Return null if no task arrived within timeout
                }
            }, timeoutMs);
        });
    }

    async waitForTasks(count, timeoutMs = 5000) {
        const tasks = [];
        const startTime = Date.now();
        
        while (tasks.length < count && (Date.now() - startTime) < timeoutMs) {
            const task = await this.waitForTask(Math.max(1, timeoutMs - (Date.now() - startTime)));
            if (task) {
                tasks.push(task);
            } else {
                break; // Timeout occurred
            }
        }
        
        return tasks;
    }

    registerCallback(eventType, callback) {
        if (!this.messageCallbacks.has(eventType)) {
            this.messageCallbacks.set(eventType, []);
        }
        this.messageCallbacks.get(eventType).push(callback);
    }

    async disconnect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
        this.isReady = false;
    }

    async isReadyForUse() {
        return this.isReady && this.ws.readyState === WebSocket.OPEN;
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
    }

    async start() {
        return new Promise((resolve, reject) => {
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
                reject(error);
            });

            this.serverProcess.on('close', (code) => {
                console.log(`NAR server process exited with code ${code}`);
                this.serverReady = false;
            });

            // Set a timeout to avoid hanging indefinitely
            setTimeout(() => {
                if (!this.serverReady) {
                    reject(new Error('NAR Server failed to start within timeout'));
                }
            }, 10000); // 10 second timeout
        });
    }

    async stop() {
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverReady = false;
        }
    }

    isRunning() {
        return this.serverReady && this.serverProcess && !this.serverProcess.killed;
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

    expect(criteria) {
        const matcher = criteria instanceof this.constructor.TaskMatch ? criteria : new this.constructor.TaskMatch(criteria);
        this.operations.push({type: 'expect', matcher, shouldExist: true});
        return this;
    }

    expectNot(criteria) {
        const matcher = criteria instanceof this.constructor.TaskMatch ? criteria : new this.constructor.TaskMatch(criteria);
        this.operations.push({type: 'expect', matcher, shouldExist: false});
        return this;
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
        // Disconnect client first
        if (this.client) {
            await this.client.disconnect();
        }

        // Stop the server
        if (this.narServer) {
            await this.narServer.stop();
        }
    }

    async execute() {
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
            for (let i = 0; i < 10; i++) {
                await this.client.sendControlCommand('step');
                await setTimeoutPromise(50);
            }

            // Wait for all derived tasks to be received
            await setTimeoutPromise(1000); // Wait for processing

            // Get all received tasks for validation
            const allTasks = [...this.client.taskQueue]; // Get a copy of all received tasks

            // Validate expectations
            for (const exp of expectations) {
                const {matcher, shouldExist} = exp;

                let found = false;
                for (const task of allTasks) {
                    if (await matcher.matches(task)) {
                        found = true;
                        break;
                    }
                }

                if ((shouldExist && !found) || (!shouldExist && found)) {
                    const taskList = allTasks.length
                        ? allTasks.map(t => `  - ${this._formatTask(t)}`).join('\n')
                        : '  (None)';

                    throw new Error(`
          ==================== TEST FAILED ====================
          Expectation: ${shouldExist ? 'FIND' : 'NOT FIND'} a task matching criteria.
          Criteria: Term="${matcher.termFilter}", MinFreq="${matcher.minFreq}", MinConf="${matcher.minConf}"

          ----- All Tasks (${allTasks.length}) -----
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
            return `${term} %${parseFloat(truth.frequency).toFixed(1)};${parseFloat(truth.confidence).toFixed(1)}%`;
        }
        return term;
    }

    /**
     * Task matcher for remote test expectations (same as TestNAR)
     */
    static TaskMatch = class {
        constructor(term) {
            this.termFilter = term || null;
            this.punctuationFilter = null;
            this.minFreq = null;
            this.maxFreq = null;
            this.minConf = null;
            this.maxConf = null;
            this.expectedFreq = null;
            this.expectedConf = null;
            this.tolerance = null;
        }

        withPunctuation(punctuation) {
            this.punctuationFilter = punctuation;
            return this;
        }

        withTruth(minFrequency, minConfidence) {
            this.minFreq = minFrequency;
            this.minConf = minConfidence;
            return this;
        }

        /**
         * Add flexible truth matching with tolerance
         * @param {number} expectedFrequency - Expected frequency value
         * @param {number} expectedConfidence - Expected confidence value
         * @param {number} tolerance - Tolerance for matching (e.g., 0.01 for 1% tolerance)
         * @returns {TaskMatch} - Returns this for method chaining
         */
        withFlexibleTruth(expectedFrequency, expectedConfidence, tolerance) {
            this.expectedFreq = expectedFrequency;
            this.expectedConf = expectedConfidence;
            this.tolerance = tolerance;
            return this;
        }

        async matches(task) {
            // Properly parse both the expected term and the received task term using the parser
            if (this.termFilter) {
                // Import parser and factory to properly compare terms
                const {NarseseParser} = await import('../parser/NarseseParser.js');
                const {TermFactory} = await import('../term/TermFactory.js');
                
                const termFactory = new TermFactory();
                const parser = new NarseseParser(termFactory);
                
                // Parse the expected term filter
                let expectedParsedTerm;
                try {
                    // The termFilter is expected in external format like "<a ==> b>", so we need punctuation
                    if (!this.termFilter.endsWith('.') && !this.termFilter.endsWith('!') && !this.termFilter.endsWith('?')) {
                        // Add default punctuation if not provided
                        expectedParsedTerm = parser.parse(this.termFilter + '.').term;
                    } else {
                        expectedParsedTerm = parser.parse(this.termFilter).term;
                    }
                } catch (parseError) {
                    console.warn(`Could not parse expected term filter: ${this.termFilter}`, parseError);
                    return false;
                }
                
                // The task.term from WebSocket is raw data, so we need to handle it properly
                // For the WebSocket pathway, we receive the actual term string in a format that can be parsed
                let actualParsedTerm = null;
                try {
                    // Check if the task is already a properly formed term string that can be parsed
                    const taskTermStr = task.term?._name || task.term || 'unknown';
                    if (taskTermStr !== 'unknown') {
                        // Try to parse the task term from server (it might be in internal format)
                        // Try both external format <...> and internal format (...)
                        if (typeof taskTermStr === 'string') {
                            let parseString = taskTermStr;
                            // If it's in internal format like (==> a b), we might need to convert to external format
                            if (taskTermStr.startsWith('(') && taskTermStr.includes(',') && taskTermStr.endsWith(')')) {
                                // Convert internal format (==> a b) to external format <a ==> b>
                                const content = taskTermStr.substring(1, taskTermStr.length - 1); // remove ()
                                const parts = content.split(',');
                                if (parts.length >= 3) {
                                    const op = parts[0].trim();
                                    const args = parts.slice(1).map(arg => arg.trim());
                                    parseString = `<${args.join(` ${op} `)}>`;
                                }
                            }
                            actualParsedTerm = parser.parse(parseString + '.').term;
                        }
                    }
                } catch (parseError) {
                    // If we can't parse the actual term, we may need to handle raw data differently
                    console.warn(`Could not parse actual task term:`, task.term, parseError);
                    // As fallback, attempt to match based on string
                    const taskTermStr = task.term?._name || task.term || String(task.term || '');
                    return taskTermStr.includes(this.termFilter.replace(/[<>]/g, ''));
                }
                
                // Compare the parsed terms with strict equality only
                if (actualParsedTerm && expectedParsedTerm) {
                    return actualParsedTerm.equals(expectedParsedTerm);
                } else {
                    return false;
                }
            }

            // Check punctuation match
            if (this.punctuationFilter) {
                // Remote tasks may have different format, need to determine type from context
                // For now, assume it's a BELIEF if no type is explicitly provided
                const taskType = task.type || 'BELIEF';
                const expectedType = this._punctToType(this.punctuationFilter);
                if (taskType !== expectedType) {
                    return false;
                }
            }

            // Check truth values - remote tasks may have different field names
            const taskTruth = task.truth;
            if (!taskTruth) {
                return false;
            }

            // Handle different truth field names that might come from the server
            const frequency = taskTruth.frequency || taskTruth.f || taskTruth.freq || 0;
            const confidence = taskTruth.confidence || taskTruth.c || taskTruth.conf || 0;

            if (this.minFreq !== null && frequency < this.minFreq) {
                return false;
            }
            if (this.minConf !== null && confidence < this.minConf) {
                return false;
            }

            // Check flexible truth matching if specified
            if (this.expectedFreq !== null && this.expectedConf !== null && this.tolerance !== null) {
                const freqDiff = Math.abs(frequency - this.expectedFreq);
                const confDiff = Math.abs(confidence - this.expectedConf);
                if (freqDiff > this.tolerance || confDiff > this.tolerance) {
                    return false;
                }
            }

            // Check range-based truth matching if specified
            if (this.minFreq !== null && this.maxFreq !== null &&
                (frequency < this.minFreq || frequency > this.maxFreq)) {
                return false;
            }
            if (this.minConf !== null && this.maxConf !== null &&
                (confidence < this.minConf || confidence > this.maxConf)) {
                return false;
            }

            return true;
        }

        _punctToType(punct) {
            const map = {'.': 'BELIEF', '!': 'GOAL', '?': 'QUESTION'};
            return map[punct] || 'BELIEF';
        }
    }
}