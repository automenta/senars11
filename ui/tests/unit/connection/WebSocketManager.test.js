import {jest} from '@jest/globals';
import {WebSocketManager} from '../../../src/connection/WebSocketManager.js';
import {Config} from '../../../src/config/Config.js';

// Mock WebSocket
global.WebSocket = class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = 0; // CONNECTING
        setTimeout(() => {
            this.readyState = 1; // OPEN
            this.onopen?.();
        }, 10);
    }

    send() {
    }

    close() {
    }
};
global.WebSocket.OPEN = 1;

describe('WebSocketManager', () => {
    let wsManager;

    beforeEach(() => {
        // Mock Config
        jest.spyOn(Config, 'getConstants').mockReturnValue({
            MAX_RECONNECT_ATTEMPTS: 3,
            RECONNECT_DELAY: 100,
            MESSAGE_BATCH_SIZE: 10
        });
        jest.spyOn(Config, 'getWebSocketUrl').mockReturnValue('ws://localhost:8080');

        wsManager = new WebSocketManager();
        // Override processSliceMs to allow immediate processing in tests (long slice)
        wsManager.processSliceMs = 1000;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('queues and processes messages', (done) => {
        wsManager.connect();

        // Wait for connection
        setTimeout(() => {
            const handler = jest.fn();
            wsManager.subscribe('test', handler);

            // Simulate incoming message
            const msg = {type: 'test', payload: 'data'};
            const event = {data: JSON.stringify(msg)};
            wsManager.ws.onmessage(event);

            // Expect handler NOT called immediately (async queue)
            // But queue processing is scheduled with setTimeout(..., 0)
            // So checking immediately might be race condition if not careful.
            // But since JS is single threaded, the setTimeout callback runs AFTER this test block yields.
            expect(handler).not.toHaveBeenCalled();

            // Wait for queue processing
            setTimeout(() => {
                expect(handler).toHaveBeenCalledWith(expect.objectContaining({type: 'test', payload: 'data'}));
                done();
            }, 50);
        }, 20);
    });

    test('processes batches', (done) => {
        wsManager.connect();
        setTimeout(() => {
            const handler = jest.fn();
            wsManager.subscribe('test', handler);

            const batch = {
                type: 'eventBatch',
                data: [
                    {type: 'test', data: '1'},
                    {type: 'test', data: '2'}
                ]
            };

            wsManager.ws.onmessage({data: JSON.stringify(batch)});

            setTimeout(() => {
                expect(handler).toHaveBeenCalledTimes(2);
                done();
            }, 50);
        }, 20);
    });
});
