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

    expect(termStr) {
        const matcher = termStr instanceof RemoteTaskMatch ? termStr : new RemoteTaskMatch(termStr);
        this.operations.push({ type: 'expect', matcher, shouldExist: true });
        return this;
    }

    expectNot(termStr) {
        const matcher = termStr instanceof RemoteTaskMatch ? termStr : new RemoteTaskMatch(termStr);
        this.operations.push({ type: 'expect', matcher, shouldExist: false });
        return this;
    }

    async execute() {
        await this.setup();

        try {
            for (const op of this.operations) {
                if (op.type === 'input') {
                    const inputStr = `${op.termStr}. %${op.freq};${op.conf}%`;
                    await this.sendNarsese(inputStr);
                } else if (op.type === 'run') {
                    for (let i = 0; i < op.cycles; i++) {
                        await this.sendNarsese('*step');
                    }
                }
            }

            // Wait for expectations to be met
            await this.waitForExpectations(this.operations.filter(op => op.type === 'expect'));

        } finally {
            await this.teardown();
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
                    if (message.type === 'event' && (message.eventType === 'task.added' || message.eventType === 'task.processed')) {
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
                this.client.close();
                this.client.on('close', () => resolve());
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

    async waitForExpectations(expectations) {
        const checkExpectations = async () => {
            for (const exp of expectations) {
                let found = false;
                for (const task of this.taskQueue) {
                    if (await exp.matcher.matches(task)) {
                        found = true;
                        break;
                    }
                }
                if ((exp.shouldExist && !found) || (!exp.shouldExist && found)) {
                    return false;
                }
            }
            return true;
        };

        const maxWaitTime = 20000;
        const interval = 100;
        let elapsedTime = 0;

        while (elapsedTime < maxWaitTime) {
            if (await checkExpectations()) {
                return;
            }
            await setTimeoutPromise(interval);
            elapsedTime += interval;
        }

        throw new Error('Expectations not met within timeout');
    }
}
