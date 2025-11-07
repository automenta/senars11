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

export { RemoteTaskMatch };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TestNARRemote {
    constructor() {
        this.operations = [];
        this.serverProcess = null;
        this.client = null;
        this.taskQueue = [];
        this.port = 8081 + Math.floor(Math.random() * 100);
    }

    input(termStr, freq = 1.0, conf = 0.9) {
        this.operations.push({ type: 'input', termStr, freq, conf });
        return this;
    }

    run(cycles = 1) {
        this.operations.push({ type: 'run', cycles });
        return this;
    }

    expect(term) {
        const matcher = term instanceof RemoteTaskMatch ? term : new RemoteTaskMatch(term);
        this.operations.push({ type: 'expect', matcher, shouldExist: true });
        return this;
    }

    expectNot(term) {
        const matcher = term instanceof RemoteTaskMatch ? term : new RemoteTaskMatch(term);
        this.operations.push({ type: 'expect', matcher, shouldExist: false });
        return this;
    }

    async execute() {
        await this.setup();

        try {
            const { inputs, runs } = this._categorizeOperations();
            
            await this._executeInputOperations(inputs);
            await this._executeRunOperations(runs);

            const expectations = this.operations.filter(op => op.type === 'expect');
            await this.waitForExpectationsEventDriven(expectations);

        } finally {
            await this.teardown();
        }
    }

    _categorizeOperations() {
        const inputs = [];
        const runs = [];

        for (const op of this.operations) {
            switch (op.type) {
                case 'input':
                    inputs.push(op);
                    break;
                case 'run':
                    runs.push(op);
                    break;
            }
        }

        return { inputs, runs };
    }

    async _executeInputOperations(inputs) {
        for (const op of inputs) {
            const inputStr = `${op.termStr}. %${op.freq};${op.conf}%`;
            await this.sendNarsese(inputStr);
        }
    }

    async _executeRunOperations(runs) {
        for (const op of runs) {
            for (let i = 0; i < op.cycles; i++) {
                await this.sendNarsese('*step');
            }
        }
    }

    async setup() {
        await this.startServer();
        await this.connectClient();
    }

    async teardown() {
        await this.disconnectClient();
        await this.stopServer();
    }

    startServer() {
        return new Promise((resolve, reject) => {
            this.serverProcess = spawn('node', [join(__dirname, '../index.js')], {
                stdio: 'pipe',
                env: { ...process.env, WS_PORT: this.port.toString(), NODE_ENV: 'test' },
            });

            this.serverProcess.stdout.on('data', (data) => {
                if (data.toString().includes('WebSocket monitoring server started')) {
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.error(`Server stderr: ${data}`);
                reject(new Error(`Server error: ${data}`));
            });
        });
    }

    stopServer() {
        return new Promise((resolve) => {
            if (this.serverProcess) {
                // Try graceful shutdown first
                if (this.client && this.client.readyState === WebSocket.OPEN) {
                    this.sendNarsese('*exit').then(() => {
                        this.serverProcess.on('close', () => resolve());
                    }).catch(() => {
                        // Fallback to SIGTERM
                        this.serverProcess.kill('SIGTERM');
                        this.serverProcess.on('close', () => resolve());
                    });
                } else {
                    // Fallback to SIGTERM
                    this.serverProcess.kill('SIGTERM');
                    this.serverProcess.on('close', () => resolve());
                }
            } else {
                resolve();
            }
        });
    }

    connectClient() {
        return new Promise((resolve, reject) => {
            this.client = new WebSocket(`ws://localhost:${this.port}/ws?session=test`);

            this.client.on('open', () => {
                this.client.on('message', (data) => {
                    const message = JSON.parse(data);
                    if (message.type === 'event' && (message.eventType === 'task.added' || message.eventType === 'task.processed' || message.eventType === 'reasoning.derivation')) {
                        const taskData = message.data?.data?.task || message.data?.task;
                        if (taskData) {
                            this.taskQueue.push(taskData);
                        }
                    }
                });
                resolve();
            });

            this.client.on('error', (error) => {
                reject(error);
            });
        });
    }

    disconnectClient() {
        return new Promise((resolve) => {
            if (this.client) {
                // Remove all listeners to prevent memory leaks
                this.client.removeAllListeners();
                this.client.close();
                // Resolve immediately instead of waiting for close event to speed things up
                resolve();
            } else {
                resolve();
            }
        });
    }

    sendNarsese(narseseString) {
        return new Promise((resolve, reject) => {
            let message;
            if (narseseString.startsWith('*')) {
                message = {
                    sessionId: 'test',
                    type: `control/${narseseString.substring(1)}`,
                    payload: {}
                };
            } else {
                message = {
                    sessionId: 'test',
                    type: 'reason/step',
                    payload: { text: narseseString }
                };
            }

            this.client.send(JSON.stringify(message), (error) => {
                if (error) {
                    return reject(error);
                }
                if (message.type.startsWith('control/')) {
                    const ackListener = (data) => {
                        const response = JSON.parse(data);
                        if (response.type === 'control/ack' && response.payload.command === narseseString.substring(1)) {
                            this.client.removeListener('message', ackListener);
                            resolve();
                        }
                    };
                    this.client.on('message', ackListener);
                } else {
                    resolve();
                }
            });
        });
    }

    async waitForExpectationsEventDriven(expectations) {
        // Create a promise for each expectation that resolves when the expectation is met
        const expectationPromises = expectations.map(exp => {
            return new Promise((resolve, reject) => {
                // Set timeout for this expectation
                const timeout = setTimeout(() => {
                    reject(new Error(`Expectation timeout: ${exp.matcher.termFilter}`));
                }, 10000); // 10 second timeout per expectation

                // Check if the expectation is already satisfied with existing tasks
                const checkExistingTasks = () => {
                    for (const task of this.taskQueue) {
                        if (exp.matcher.matches(task)) {
                            if (exp.shouldExist) {
                                clearTimeout(timeout);
                                return resolve();
                            } else if (!exp.shouldExist) {
                                clearTimeout(timeout);
                                return reject(new Error(`Unexpected task found: ${exp.matcher.termFilter}`));
                            }
                        }
                    }
                    
                    // If we're looking for a task that should NOT exist and we don't find it, that's good
                    if (!exp.shouldExist && this.taskQueue.length > 0) {
                        clearTimeout(timeout);
                        return resolve();
                    }
                };

                checkExistingTasks();

                // If the expectation wasn't already met, set up listener for new tasks
                if (exp.shouldExist || this.taskQueue.length === 0) {
                    const messageHandler = (data) => {
                        const message = JSON.parse(data);
                        if (message.type === 'event' && (message.eventType === 'task.added' || message.eventType === 'task.processed' || message.eventType === 'reasoning.derivation')) {
                            const taskData = message.data?.data?.task || message.data?.task;
                            if (taskData) {
                                if (exp.matcher.matches(taskData)) {
                                    if (exp.shouldExist) {
                                        clearTimeout(timeout);
                                        this.client.removeListener('message', messageHandler);
                                        resolve();
                                    } else {
                                        clearTimeout(timeout);
                                        this.client.removeListener('message', messageHandler);
                                        reject(new Error(`Unexpected task found: ${exp.matcher.termFilter}`));
                                    }
                                }
                            }
                        }
                    };

                    this.client.on('message', messageHandler);
                }
            });
        });

        try {
            // Wait for all expectations to be satisfied
            await Promise.all(expectationPromises);
        } catch (error) {
            // If any expectation failed, throw the error
            throw new Error(`Test expectations not met: ${error.message}`);
        }
    }

    async waitForExpectations(expectations) {
        // Legacy method - keeping for compatibility, but this should now call the event-driven method
        return this.waitForExpectationsEventDriven(expectations);
    }
}
