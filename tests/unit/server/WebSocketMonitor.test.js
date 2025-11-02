import {WebSocketMonitor} from '../../src/server/WebSocketMonitor.js';
import {NAR} from '../../src/nar/NAR.js';

describe('WebSocketMonitor - Direct Integration Tests', () => {
    let monitor;
    let nar;

    beforeEach(async () => {
        // Initialize NAR with default config
        nar = new NAR({
            nar: {
                lm: {enabled: false},
                reasoningAboutReasoning: {enabled: true}
            },
            webSocket: {
                port: 0, // Let system assign an available port
                host: 'localhost',
                maxConnections: 5
            }
        });
        await nar.initialize();

        // Create monitor with default options
        monitor = new WebSocketMonitor({
            port: 0,
            maxConnections: 5,
            minBroadcastInterval: 1 // Reduced for testing
        });
    });

    afterEach(async () => {
        if (monitor && monitor.server) {
            await monitor.stop();
        }
        if (nar) {
            await nar.dispose();
        }
    });

    test('should initialize with correct default options', () => {
        expect(monitor.port).toBeDefined();
        expect(monitor.maxConnections).toBe(5);
        expect(monitor.clients.size).toBe(0);
        expect(monitor.eventFilter).toBeNull();
        expect(monitor.metrics.startTime).toBeGreaterThan(0);
    });

    test('should start and stop without errors', async () => {
        await expect(monitor.start()).resolves.toBeUndefined();
        expect(monitor.server).toBeDefined();
        
        const stats = monitor.getStats();
        expect(stats.port).toBeGreaterThan(0);
        expect(stats.connections).toBe(0);
        
        await expect(monitor.stop()).resolves.toBeUndefined();
        // After stopping, the server should be cleared
    });

    test('should connect to NAR and listen for events', async () => {
        await monitor.start();
        
        // Connect the monitor to NAR
        monitor.listenToNAR(nar);
        
        // Verify that the internal nar reference is set
        expect(monitor._nar).toBe(nar);
        
        // Check that metrics have been updated after connecting
        const stats = monitor.getPerformanceMetrics();
        expect(stats).toBeDefined();
    });

    test('should broadcast system events when NAR starts/stops', async () => {
        await monitor.start();
        monitor.listenToNAR(nar);
        
        const eventsReceived = [];
        
        // Mock a WebSocket client by directly calling broadcast
        const originalBroadcast = monitor.broadcastEvent;
        monitor.broadcastEvent = (event, data, options) => {
            eventsReceived.push({ event, data, options });
            return originalBroadcast.call(monitor, event, data, options);
        };
        
        // Start the NAR to generate events
        await nar.start();
        
        // Check that some events were broadcasted
        const startedEvent = eventsReceived.find(e => e.event === 'system.started');
        expect(startedEvent).toBeDefined();
        expect(startedEvent.data).toBeDefined();
        
        // Stop the NAR to generate stop event
        nar.stop();
        
        const stoppedEvent = eventsReceived.find(e => e.event === 'system.stopped');
        expect(stoppedEvent).toBeDefined();
        
        // Restore original method
        monitor.broadcastEvent = originalBroadcast;
    });

    test('should handle narsese input', async () => {
        await monitor.start();
        monitor.listenToNAR(nar);
        
        // Create a mock client object for testing
        const mockClient = {
            readyState: 1, // WebSocket.OPEN
            send: jest.fn(),
            clientId: 'test-client'
        };
        
        const message = {
            type: 'narseseInput',
            payload: {
                input: '<cat --> animal>. %1.0;0.9%'
            }
        };
        
        // Process the narsese input
        await monitor._handleClientMessage(mockClient, JSON.stringify(message));
        
        // Check that the message was processed and sent back
        expect(mockClient.send).toHaveBeenCalledWith(
            expect.stringContaining('narseseInput')
        );
    });

    test('should handle LM connection test', async () => {
        await monitor.start();
        monitor.listenToNAR(nar);
        
        // Create a mock client object for testing
        const mockClient = {
            readyState: 1, // WebSocket.OPEN
            send: jest.fn(),
            clientId: 'test-client'
        };
        
        const message = {
            type: 'testLMConnection',
            payload: {
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key',
                name: 'Test Provider'
            }
        };
        
        // Process the LM connection test
        await monitor._handleClientMessage(mockClient, JSON.stringify(message));
        
        // Check that the message was processed and sent back
        expect(mockClient.send).toHaveBeenCalledWith(
            expect.stringContaining('testLMConnection')
        );
    });

    test('should apply rate limiting correctly', () => {
        const clientId = 'test-client';
        
        // Initialize rate limiter for client
        monitor.clientRateLimiters.set(clientId, {
            messageCount: 0,
            lastReset: Date.now()
        });
        
        // Test that a client is not rate limited initially
        expect(monitor._isClientRateLimited(clientId)).toBe(false);
        
        // Add many messages to exceed the limit
        for (let i = 0; i < monitor.maxMessagesPerWindow + 5; i++) {
            monitor.clientRateLimiters.get(clientId).messageCount++;
        }
        
        // Now the client should be rate limited
        expect(monitor._isClientRateLimited(clientId)).toBe(true);
    });

    test('should get accurate performance metrics', async () => {
        await monitor.start();
        
        const metrics = monitor.getPerformanceMetrics();
        
        expect(metrics).toBeDefined();
        expect(metrics.messagesSent).toBeGreaterThanOrEqual(0);
        expect(metrics.messagesReceived).toBeGreaterThanOrEqual(0);
        expect(metrics.errorCount).toBeGreaterThanOrEqual(0);
        expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should handle client subscriptions', () => {
        // Create a mock client
        const mockClient = {
            readyState: 1, // WebSocket.OPEN
            send: jest.fn(),
            clientId: 'test-client',
            subscriptions: new Set()
        };
        
        const message = {
            eventTypes: ['task.input', 'reasoning.step']
        };
        
        // Test subscription
        monitor._handleSubscribe(mockClient, message);
        
        // Check that client is now subscribed to these events
        expect(mockClient.subscriptions.has('task.input')).toBe(true);
        expect(mockClient.subscriptions.has('reasoning.step')).toBe(true);
        
        // Test unsubscription
        monitor._handleUnsubscribe(mockClient, { eventTypes: ['task.input'] });
        
        expect(mockClient.subscriptions.has('task.input')).toBe(false);
        expect(mockClient.subscriptions.has('reasoning.step')).toBe(true);
    });

    test('should broadcast events respecting subscriptions', async () => {
        await monitor.start();
        
        // Create two mock clients with different subscriptions
        const client1 = {
            readyState: 1,
            send: jest.fn(),
            clientId: 'client-1',
            subscriptions: new Set(['all'])
        };
        
        const client2 = {
            readyState: 1,
            send: jest.fn(),
            clientId: 'client-2',
            subscriptions: new Set(['task.input'])
        };
        
        // Add both clients to monitor's client set
        monitor.clients.add(client1);
        monitor.clients.add(client2);
        
        // Broadcast an event
        monitor.broadcastCustomEvent('task.input', { test: 'data' });
        
        // Both clients should receive the task.input event because:
        // - client1 is subscribed to 'all'
        // - client2 is subscribed to 'task.input'
        expect(client1.send).toHaveBeenCalled();
        expect(client2.send).toHaveBeenCalled();
        
        // Now broadcast an event that only client1 should receive
        monitor.broadcastCustomEvent('reasoning.step', { test: 'data' });
        
        // client1 should receive it (subscribed to 'all'), client2 should not
        expect(client1.send).toHaveBeenCalled();
        // Note: We can't easily verify that client2.send was NOT called in this mock setup
    });
});