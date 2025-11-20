/**
 * @file websocket-integration.test.js
 * @description Integration tests for WebSocketManager interacting with mocked WebSocket and Config.
 */

import {jest} from '@jest/globals';
import {WebSocketManager} from '../../src/connection/WebSocketManager.js';

describe('WebSocketManager Integration', () => {
    let wsManager;
    let originalWebSocket;
    let mockWsInstance;
    let originalWindow;

    beforeAll(() => {
        originalWebSocket = global.WebSocket;
        originalWindow = global.window;
    });

    afterAll(() => {
        global.WebSocket = originalWebSocket;
        global.window = originalWindow;
    });

    beforeEach(() => {
        // Mock Window and Config
        global.window = Object.create(originalWindow);
        Object.defineProperty(global.window, 'location', {
            value: {hostname: 'localhost', protocol: 'http:'},
            writable: true
        });
        // Ensure WEBSOCKET_CONFIG is undefined so it falls back to defaults or uses window location
        global.window.WEBSOCKET_CONFIG = undefined;
        global.window.requestAnimationFrame = (cb) => cb();

        // Mock WebSocket Class
        mockWsInstance = {
            send: jest.fn(),
            close: jest.fn(),
            readyState: 1, // OPEN
            // Event handlers will be assigned by WebSocketManager
            onopen: null,
            onclose: null,
            onerror: null,
            onmessage: null
        };

        global.WebSocket = jest.fn(() => mockWsInstance);
        global.WebSocket.OPEN = 1;
        global.WebSocket.CLOSED = 3;

        wsManager = new WebSocketManager();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should connect and set status to connected on open', () => {
        wsManager.connect();

        expect(global.WebSocket).toHaveBeenCalled();
        expect(wsManager.ws).toBeDefined();

        // Simulate onopen
        if (wsManager.ws.onopen) {
            wsManager.ws.onopen();
        }

        expect(wsManager.getConnectionStatus()).toBe('connected');
    });

    test('should handle incoming messages and dispatch to subscribers', () => {
        wsManager.connect();
        // Simulate open
        wsManager.ws.onopen();

        const mockHandler = jest.fn();
        wsManager.subscribe('narsese.result', mockHandler);

        const testPayload = {result: 'test'};
        const message = {
            type: 'narsese.result',
            data: testPayload
        };

        // Simulate onmessage
        // Note: WebSocketManager expects event.data to be a JSON string
        const event = {data: JSON.stringify(message)};
        wsManager.ws.onmessage(event);

        // The handler should be called with the parsed message
        // WebSocketManager._handleMessage passes the whole message object to handlers
        expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
            type: 'narsese.result',
            data: testPayload
        }));
    });

    test('should handle batch messages', () => {
        wsManager.connect();
        wsManager.ws.onopen();

        const mockHandler = jest.fn();
        wsManager.subscribe('concept.created', mockHandler);

        const batchMessage = {
            type: 'eventBatch',
            data: [
                {type: 'concept.created', data: {concept: 'A'}},
                {type: 'concept.created', data: {concept: 'B'}}
            ]
        };

        const event = {data: JSON.stringify(batchMessage)};
        wsManager.ws.onmessage(event);

        expect(mockHandler).toHaveBeenCalledTimes(2);
        expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
            payload: {concept: 'A'}
        }));
        expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
            payload: {concept: 'B'}
        }));
    });

    test('should handle connection errors', () => {
        wsManager.connect();

        // Simulate onerror
        wsManager.ws.onerror({message: 'Connection failed'});

        expect(wsManager.getConnectionStatus()).toBe('error');
    });

    test('should attempt to reconnect on close', () => {
        jest.useFakeTimers();
        wsManager.connect();
        wsManager.ws.onopen(); // Start connected

        // Spy on connect to see if it's called again
        const connectSpy = jest.spyOn(wsManager, 'connect');

        // Simulate close
        wsManager.ws.onclose();

        expect(wsManager.getConnectionStatus()).toBe('disconnected');

        // Fast forward time to trigger reconnect
        // WebSocketConfig.RECONNECT_DELAY is 3000ms
        jest.advanceTimersByTime(4000);

        expect(connectSpy).toHaveBeenCalledTimes(1);

        jest.useRealTimers();
    });
});
