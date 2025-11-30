/**
 * @file TestNARRemote.js
 * @description Test framework for NAR functionality using WebSocket pathway
 */

import {spawn} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {WebSocket} from 'ws';
import {RemoteTaskMatch} from './TaskMatch.js';
import {VirtualGraph} from '../ui/VirtualGraph.js';
import {VirtualConsole} from '../ui/VirtualConsole.js';
import {ConsoleFormatter} from '../ui/ConsoleFormatter.js';

export {RemoteTaskMatch};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TestNARRemote {
    constructor() {
        this.operations = [];
        this.serverProcess = null;
        this.client = null;
        this.taskQueue = [];
        this.port = 8081 + Math.floor(Math.random() * 100);

        // Virtual UI components
        this.virtualGraph = new VirtualGraph();
        this.virtualConsole = new VirtualConsole(this.virtualGraph);
    }

    input(termStr, freq = 1.0, conf = 0.9) {
        this.operations.push({type: 'input', termStr, freq, conf});
        return this;
    }

    command(text, mode = 'narsese') {
        this.operations.push({type: 'command', text, mode});
        return this;
    }

    run(cycles = 1) {
        this.operations.push({type: 'run', cycles});
        return this;
    }

    expect(term) {
        const matcher = term instanceof RemoteTaskMatch ? term : new RemoteTaskMatch(term);
        this.operations.push({type: 'expect', matcher, shouldExist: true});
        return this;
    }

    expectNot(term) {
        const matcher = term instanceof RemoteTaskMatch ? term : new RemoteTaskMatch(term);
        this.operations.push({type: 'expect', matcher, shouldExist: false});
        return this;
    }

    expectLog(pattern) {
        this.operations.push({type: 'expectLog', pattern, shouldExist: true});
        return this;
    }

    expectNode(idOrTerm) {
        this.operations.push({type: 'expectNode', idOrTerm, shouldExist: true});
        return this;
    }

    async execute() {
        await this.setup();

        try {
            // Process operations
            for (const op of this.operations) {
                switch (op.type) {
                    case 'input':
                        const inputStr = `${op.termStr}. %${op.freq};${op.conf}%`;
                        await this.sendCommand(inputStr, 'narsese');
                        break;
                    case 'command':
                        await this.sendCommand(op.text, op.mode);
                        break;
                    case 'run':
                        for (let i = 0; i < op.cycles; i++) {
                            await this.sendNarsese('*step');
                        }
                        break;
                }
            }

            // Process expectations
            const expectations = this.operations.filter(op => op.type.startsWith('expect'));
            if (expectations.length > 0) {
                await this.waitForExpectationsEventDriven(expectations);
            }

        } finally {
            this.printLogs();
            await this.teardown();
        }
    }

    printLogs() {
        const logs = this.virtualConsole.getLogs();
        if (logs.length > 0) {
            console.log('\n=== Virtual Console Logs ===');
            logs.forEach(log => {
                console.log(ConsoleFormatter.format(log));
            });
            console.log('============================\n');
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
                env: {...process.env, WS_PORT: this.port.toString(), NODE_ENV: 'test'},
            });

            this.serverProcess.stdout.on('data', (data) => {
                const str = data.toString();
                if (str.includes('Server running')) {
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.error(`Server stderr: ${data}`);
                // Don't reject immediately, wait for close or error
            });

            this.serverProcess.on('error', (err) => {
                reject(err);
            });
        });
    }

    stopServer() {
        return new Promise((resolve) => {
            if (this.serverProcess) {
                this.serverProcess.removeAllListeners();

                const timeout = setTimeout(() => {
                    this.serverProcess.kill('SIGKILL');
                }, 3000);

                this.serverProcess.on('close', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                if (this.client && this.client.readyState === WebSocket.OPEN) {
                    this.sendNarsese('*exit').catch(() => {
                        this.serverProcess.kill('SIGTERM');
                    });
                } else {
                    this.serverProcess.kill('SIGTERM');
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
                    this.handleMessage(message);
                });
                resolve();
            });

            this.client.on('error', (error) => {
                reject(error);
            });
        });
    }

    handleMessage(message) {
        if (message.type === 'eventBatch' && Array.isArray(message.data)) {
            message.data.forEach(event => {
                this.handleMessage({
                    type: event.type,
                    payload: event.data,
                    timestamp: event.timestamp,
                    traceId: event.traceId
                });
            });
            return;
        }

        // Normalize payload/data
        const payload = message.payload || message.data;
        const normalizedMessage = { ...message, payload };

        // Update Virtual UI
        this.virtualGraph.updateFromMessage(normalizedMessage);
        this.virtualConsole.processMessage(normalizedMessage);

        // Legacy task queue logic
        if (message.type === 'task.added' || message.type === 'task.processed' || message.type === 'reasoning.derivation') {
            const taskData = payload?.task || payload?.derivedTask || payload;
            if (taskData) {
                this.taskQueue.push(taskData);
            }
        }

        // Handle wrapped events (legacy compat)
        if (message.type === 'event' && (message.eventType === 'task.added' || message.eventType === 'task.processed' || message.eventType === 'reasoning.derivation')) {
             const taskData = message.data?.data?.task || message.data?.task;
             if (taskData) {
                 this.taskQueue.push(taskData);
             }
        }
    }

    disconnectClient() {
        return new Promise((resolve) => {
            if (this.client) {
                this.client.removeAllListeners();
                if (this.client.readyState === WebSocket.OPEN) {
                    this.client.close();
                }
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
                    payload: {text: narseseString}
                };
            }

            this.client.send(JSON.stringify(message), (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
    }

    sendCommand(command, mode) {
        return new Promise((resolve, reject) => {
            const messageType = mode === 'agent' ? 'agent/input' : 'narseseInput';
            const message = {
                type: messageType,
                payload: {input: command}
            };

            this.client.send(JSON.stringify(message), (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
    }

    async waitForExpectationsEventDriven(expectations) {
        const expectationPromises = expectations.map(exp => {
            return new Promise((resolve, reject) => {
                let listener = null;
                let timeout = null;

                const cleanup = () => {
                    if (listener) {
                        this.client.removeListener('message', listener);
                    }
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                };

                const safeResolve = () => {
                    cleanup();
                    resolve();
                };

                const safeReject = (err) => {
                    cleanup();
                    reject(err);
                };

                timeout = setTimeout(() => {
                    safeReject(new Error(`Expectation timeout: ${JSON.stringify(exp)}`));
                }, 25000);

                const checkState = async () => {
                    try {
                        // Check task queue (legacy)
                        if (exp.type === 'expect') {
                            for (const task of this.taskQueue) {
                                if (await exp.matcher.matches(task)) {
                                    if (exp.shouldExist) {
                                        safeResolve();
                                        return;
                                    } else {
                                        safeReject(new Error(`Unexpected task found: ${exp.matcher.termFilter}`));
                                        return;
                                    }
                                }
                            }
                            if (!exp.shouldExist && this.taskQueue.length > 0) {
                                safeResolve();
                                return;
                            }
                        }
                        // Check logs
                        else if (exp.type === 'expectLog') {
                            const logs = this.virtualConsole.getLogs();
                            const found = logs.some(log => {
                                if (typeof exp.pattern === 'string') {
                                    return typeof log.content === 'string' && log.content.includes(exp.pattern);
                                } else if (exp.pattern instanceof RegExp) {
                                    return typeof log.content === 'string' && exp.pattern.test(log.content);
                                }
                                return false;
                            });

                            if (found && exp.shouldExist) {
                                safeResolve();
                                return;
                            }
                        }
                        // Check nodes
                        else if (exp.type === 'expectNode') {
                            if (this.virtualGraph.hasNode(exp.idOrTerm)) {
                                if (exp.shouldExist) {
                                    safeResolve();
                                    return;
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Error in checkState:", err);
                    }
                };

                checkState();

                // Listen for updates
                if (exp.shouldExist) {
                    listener = (data) => {
                         // Trigger check
                         checkState();
                    };

                    this.client.on('message', listener);
                }
            });
        });

        await Promise.all(expectationPromises);
    }
}
