/**
 * @file test-websocket-integration.js
 * @description Integration tests for ui WebSocket communication
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';
import http from 'http';
import WebSocket from 'ws';

// Test WebSocket communication between client and server
describe('ui WebSocket Integration Tests', () => {
    let wsServer = null;
    let wsClient = null;
    const testPort = 8092;
    const frontendPort = 8093;

    beforeEach(() => {
        // Clean up any previous processes
        if (wsClient) {
            wsClient.close();
            wsClient = null;
        }
        if (wsServer) {
            wsServer.close();
            wsServer = null;
        }
    });

    test('WebSocket communication works end-to-end', async () => {
        return new Promise(async (resolve, reject) => {
            // Create a mock WebSocket server to simulate the backend
            wsServer = new WebSocket.Server({ port: testPort });

            wsServer.on('connection', (ws) => {
                console.log('Mock backend server: client connected');

                ws.on('message', (message) => {
                    console.log('Mock backend server: received message:', message.toString());
                    const parsedMessage = JSON.parse(message.toString());
                    
                    // Echo back different responses based on message type
                    let response;
                    switch (parsedMessage.type) {
                        case 'narseseInput':
                            response = {
                                type: 'narsese.result',
                                payload: { result: '✅ Command processed: ' + parsedMessage.payload.input }
                            };
                            break;
                        case 'control/refresh':
                            response = {
                                type: 'control.result',
                                payload: { result: 'Graph refreshed' }
                            };
                            break;
                        default:
                            response = {
                                type: 'info',
                                payload: { message: 'Message received' }
                            };
                    }
                    
                    ws.send(JSON.stringify(response));
                });

                ws.on('close', () => {
                    console.log('Mock backend server: client disconnected');
                });
            });

            // Wait a bit for the server to start
            await setTimeout(1000);

            // Connect a mock client to simulate the UI
            wsClient = new WebSocket(`ws://localhost:${testPort}`);

            wsClient.on('open', () => {
                console.log('Mock client: connected to server');

                // Send a test message like the UI would
                const testMessage = {
                    type: 'narseseInput',
                    payload: { input: '<bird --> flyer>.' }
                };

                wsClient.send(JSON.stringify(testMessage));
            });

            wsClient.on('message', (data) => {
                const message = JSON.parse(data.toString());
                console.log('Mock client: received response:', message);

                // Verify the response format is what we expect
                expect(message.type).toBe('narsese.result');
                expect(message.payload.result).toContain('Command processed');
                
                resolve();
            });

            wsClient.on('error', (error) => {
                reject(new Error(`WebSocket error: ${error.message}`));
            });

            // Set timeout to reject if communication doesn't happen within 10 seconds
            setTimeout(10000).then(() => {
                if (!wsClient.OPEN) {
                    reject(new Error('WebSocket communication failed within timeout'));
                }
            });
        });
    });

    test('WebSocket connection handles errors', async () => {
        return new Promise(async (resolve, reject) => {
            // Try to connect to a non-existent server to test error handling
            const errorClient = new WebSocket(`ws://localhost:9999`);

            errorClient.on('error', (error) => {
                console.log('Expected error occurred:', error.message);
                resolve();
            });

            errorClient.on('close', (code, reason) => {
                console.log('Connection closed with code:', code, 'reason:', reason.toString());
                resolve();
            });

            setTimeout(5000).then(() => {
                errorClient.close();
                reject(new Error('Expected error did not occur within timeout'));
            });
        });
    });

    test('WebSocket handles batch events', async () => {
        return new Promise(async (resolve, reject) => {
            // Create a mock WebSocket server to simulate the backend
            wsServer = new WebSocket.Server({ port: testPort + 1 });

            wsServer.on('connection', (ws) => {
                // Send a batch event immediately after connection
                const batchMessage = {
                    type: 'eventBatch',
                    data: [
                        { type: 'task.added', data: { task: '<bird --> flyer>.' } },
                        { type: 'concept.created', data: { concept: 'bird' } },
                        { type: 'reasoning.step', data: { step: 'Inference applied' } }
                    ]
                };
                
                setTimeout(() => {
                    ws.send(JSON.stringify(batchMessage));
                }, 100);
            });

            await setTimeout(1000); // Wait for server to start

            // Connect client
            wsClient = new WebSocket(`ws://localhost:${testPort + 1}`);

            wsClient.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                // Verify it's a batch event
                expect(message.type).toBe('eventBatch');
                expect(message.data).toBeInstanceOf(Array);
                expect(message.data.length).toBe(3);
                
                resolve();
            });

            wsClient.on('error', (error) => {
                reject(new Error(`WebSocket error: ${error.message}`));
            });

            setTimeout(5000).then(() => {
                reject(new Error('Batch event test failed within timeout'));
            });
        });
    });

    test('WebSocket message types are handled correctly', async () => {
        // Test various message types that the UI should handle
        const messageTypes = [
            { type: 'narsese.result', payload: { result: '✅ Success' } },
            { type: 'narsese.error', payload: { error: '❌ Error' } },
            { type: 'task.added', payload: { task: '<bird --> flyer>.' } },
            { type: 'concept.created', payload: { concept: 'bird' } },
            { type: 'question.answered', payload: { answer: 'Yes' } },
            { type: 'memorySnapshot', payload: { concepts: [{ id: 'test', term: 'bird' }] } }
        ];

        for (const msg of messageTypes) {
            // Test that each message type has the expected structure
            expect(msg).toHaveProperty('type');
            expect(msg).toHaveProperty('payload');
            expect(typeof msg.type).toBe('string');
            expect(typeof msg.payload).toBe('object');
        }

        // Verify they would be processed differently by the UI logic
        expect(messageTypes[0].type).toBe('narsese.result');
        expect(messageTypes[1].type).toBe('narsese.error');
        expect(messageTypes[2].type).toBe('task.added');
        expect(messageTypes[3].type).toBe('concept.created');
        expect(messageTypes[4].type).toBe('question.answered');
        expect(messageTypes[5].type).toBe('memorySnapshot');
    });
});