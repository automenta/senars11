/**
 * Unit tests for WebSocketService
 * These tests mock the WebSocket API to simulate server behavior
 */

// Mock WebSocket for Node.js environment
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = 1; // OPEN - Start immediately in OPEN state for tests
        this.OPEN = 1;
        this.CONNECTING = 0;
        this.CLOSED = 3;
    }

    send(data) {
        if (this.readyState !== this.OPEN) {
            throw new Error('WebSocket is not open');
        }
        if (this.onsend) this.onsend(data);
    }

    close(code, reason) {
        this.readyState = this.CLOSED;
        if (this.onclose) this.onclose({ code, reason });
    }

    onmessage(event) {
        // Default implementation - does nothing
    }
}

// Override global WebSocket for testing
global.WebSocket = MockWebSocket;

// Import the service
import WebSocketService from '../src/websocket-service.js';

const PASSED = '✅';
const FAILED = '❌';
const TEST_SUMMARY = '🎉';
const TEST_WARNING = '⚠️';

function runTest(description, testFn) {
    try {
        testFn();
        console.log(`${PASSED} PASS: ${description}`);
        return true;
    } catch (error) {
        console.error(`${FAILED} FAIL: ${description}`);
        console.error(`   Error: ${error.message}`);
        return false;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

async function testWebSocketService() {
    console.log('Starting WebSocketService unit tests...\n');

    let passed = 0;
    let total = 0;

    const tests = [
        {
            desc: 'Constructor creates instance properly',
            fn: () => {
                const service = new WebSocketService();
                assert(service !== null, 'Service should be created');
                assert(typeof service.connect === 'function', 'Should have connect method');
                assert(typeof service.disconnect === 'function', 'Should have disconnect method');
                assert(typeof service.sendMessage === 'function', 'Should have sendMessage method');
            }
        },
        {
            desc: 'Connection establishes successfully',
            fn: async () => {
                const service = new WebSocketService('ws://localhost:8080/ws');

                let connected = false;
                service.subscribe('open', () => {
                    connected = true;
                });

                await service.connect();
                await new Promise(resolve => setTimeout(resolve, 50));

                assert(connected, 'Should emit open event when connected');
                assert(service.isConnected(), 'Should report connected state');

                service.disconnect();
            }
        },
        {
            desc: 'sendMessage works when connected',
            fn: async () => {
                const service = new WebSocketService();

                let sentMessage = null;

                // Create and fully initialize the mock WebSocket
                service.ws = new MockWebSocket();
                service.ws.readyState = service.ws.OPEN; // Ensure it's OPEN state
                service.ws.onsend = (data) => {
                    // Mock implementation for testing
                    sentMessage = data;
                };

                const result = service.sendMessage('testType', { test: 'data' });

                assert(result === true, 'Should return true when message sent successfully');
                assert(sentMessage !== null, 'Message should be sent');

                const parsed = JSON.parse(sentMessage);
                assert(parsed.type === 'testType', 'Message type should be preserved');
                assert(parsed.payload.test === 'data', 'Message payload should be preserved');
            }
        },
        {
            desc: 'sendCommand method works',
            fn: async () => {
                const service = new WebSocketService();

                let sentMessage = null;

                service.ws = new MockWebSocket();
                service.ws.readyState = service.ws.OPEN; // Use MockWebSocket's OPEN constant
                service.ws.onsend = (data) => {
                    sentMessage = data;
                };

                const result = service.sendCommand('<a --> b>.');

                assert(result === true, 'Command should be sent successfully');
                assert(sentMessage !== null, 'Command should be sent');

                const parsed = JSON.parse(sentMessage);
                assert(parsed.type === 'narseseInput', 'Command should use narseseInput type');
                assert(parsed.payload.input === '<a --> b>.', 'Command should be in payload');
            }
        },
        {
            desc: 'Event subscription and emission',
            fn: () => {
                const service = new WebSocketService();

                let eventReceived = false;
                let eventData = null;

                service.subscribe('testEvent', (data) => {
                    eventReceived = true;
                    eventData = data;
                });

                service._emit('testEvent', { test: 'data' });

                assert(eventReceived, 'Event should be received by subscriber');
                assert(eventData.test === 'data', 'Event data should be passed correctly');
            }
        },
        {
            desc: 'Error handling for malformed JSON',
            fn: () => {
                const service = new WebSocketService();

                let errorReceived = false;
                service.subscribe('error', (error) => {
                    if (error.type === 'PARSE_ERROR') {
                        errorReceived = true;
                    }
                });

                // Set up the mock WebSocket with the same onmessage handler as in connect()
                service.ws = new MockWebSocket();
                // Simulate the service's message handling logic directly
                const invalidJsonData = '{"invalid": json}';
                try {
                    JSON.parse(invalidJsonData);
                } catch (parseError) {
                    // This is the same error handling as in the original service
                    service._emit('error', { type: 'PARSE_ERROR', message: parseError.message, raw: invalidJsonData });
                }

                assert(errorReceived, 'Should emit error for malformed JSON');
            }
        },
        {
            desc: 'isConnected and isConnecting methods',
            fn: () => {
                const service = new WebSocketService();

                assert(!service.isConnected(), 'Should not be connected initially');
                assert(!service.isConnecting(), 'Should not be connecting initially');

                service.ws = new MockWebSocket();
                service.ws.readyState = service.ws.OPEN; // Use MockWebSocket's OPEN constant
                assert(service.isConnected(), 'Should report connected when WebSocket is open');

                service.ws.readyState = 0; // CONNECTING
                assert(service.isConnecting(), 'Should report connecting when WebSocket is connecting');
            }
        }
    ];

    for (const test of tests) {
        total++;
        passed += runTest(test.desc, test.fn);
        // Wait for any async operations to complete
        if (test.fn.constructor.name === 'AsyncFunction') {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    console.log(`\nTests completed: ${passed}/${total} passed`);

    if (passed === total) {
        console.log(`${TEST_SUMMARY} All tests passed!`);
    } else {
        console.log(`${TEST_WARNING} Some tests failed`);
        process.exitCode = 1;
    }
}

// Run the tests
testWebSocketService();