import {WebSocketServer} from 'ws';
import {EventEmitter} from 'events';

const DEFAULT_OPTIONS = Object.freeze({
    port: 8080,
    host: 'localhost',
    path: '/ws',
    maxConnections: 50, // Increased default for better scalability
    minBroadcastInterval: 1, // Reduced for better real-time experience
    messageBufferSize: 10000, // Max size for message buffer
    rateLimitWindowMs: 1000, // 1 second window for rate limiting
    maxMessagesPerWindow: 1000 // Max messages per window per client
});

const NAR_EVENTS = Object.freeze([
    'task.input',
    'task.processed',
    'cycle.start',
    'cycle.complete',
    'task.added',
    'belief.added',
    'question.answered',
    'system.started',
    'system.stopped',
    'system.reset',
    'system.loaded',
    'reasoning.step', // Added for better reasoning trace
    'concept.created', // Added for concept awareness
    'task.completed'  // Added for better task tracking
]);

class WebSocketMonitor {
    constructor(options = {}) {
        // Assign options with defaults
        this.port = options.port ?? DEFAULT_OPTIONS.port;
        this.host = options.host ?? DEFAULT_OPTIONS.host;
        this.path = options.path ?? DEFAULT_OPTIONS.path;
        this.maxConnections = options.maxConnections ?? DEFAULT_OPTIONS.maxConnections;
        this.eventFilter = options.eventFilter ?? null;

        // Initialize collections
        this.clients = new Set();
        this.eventEmitter = new EventEmitter();
        this.server = null;
        this.clientMessageHandlers = new Map();

        // Metrics
        this.metrics = this._initializeMetrics();

        // Rate limiting
        this.broadcastRateLimiter = {
            lastBroadcastTime: new Map(),
            minInterval: options.minBroadcastInterval ?? DEFAULT_OPTIONS.minBroadcastInterval
        };
        this.clientRateLimiters = new Map();
        this.rateLimitWindowMs = options.rateLimitWindowMs ?? DEFAULT_OPTIONS.rateLimitWindowMs;
        this.maxMessagesPerWindow = options.maxMessagesPerWindow ?? DEFAULT_OPTIONS.maxMessagesPerWindow;
        this.messageBufferSize = options.messageBufferSize ?? DEFAULT_OPTIONS.messageBufferSize;

        // Client capabilities
        this.clientCapabilities = new Map();
    }

    _initializeMetrics() {
        return {
            startTime: Date.now(),
            messagesSent: 0,
            messagesReceived: 0,
            errorCount: 0,
            clientConnectionCount: 0,
            clientDisconnectionCount: 0,
            broadcastPerformance: [],
            clientMessageCounts: new Map(),
            lastWindowReset: Date.now()
        };
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server = new WebSocketServer({
                port: this.port,
                host: this.host,
                path: this.path,
                maxPayload: 1024 * 1024 // 1MB max payload
            });

            this.server.on('connection', (ws, request) => {
                if (this.clients.size >= this.maxConnections) {
                    ws.close(1013, 'Server busy, too many connections');
                    return;
                }

                this.clients.add(ws);
                this.metrics.clientConnectionCount++;

                const clientId = this._generateClientId();
                ws.clientId = clientId;

                // Initialize rate limiter for this client
                this.clientRateLimiters.set(clientId, {
                    messageCount: 0,
                    lastReset: Date.now()
                });

                this._sendToClient(ws, {
                    type: 'connection',
                    data: {
                        clientId,
                        timestamp: Date.now(),
                        message: 'Connected to SeNARS monitoring server',
                        serverVersion: '10.0.0',
                        capabilities: ['narseseInput', 'testLMConnection', 'subscribe', 'unsubscribe']
                    }
                });

                ws.on('message', (data) => {
                    // Check rate limiting for this client
                    if (!this._isClientRateLimited(clientId)) {
                        this.metrics.messagesReceived++;
                        this._handleClientMessage(ws, data);
                    } else {
                        console.warn(`Rate limit exceeded for client: ${clientId}`);
                        this._sendToClient(ws, {
                            type: 'error',
                            message: 'Rate limit exceeded',
                            code: 429
                        });
                    }
                });

                ws.on('close', () => {
                    this.clients.delete(ws);
                    this.clientRateLimiters.delete(clientId);
                    this.clientCapabilities.delete(clientId);
                    this.metrics.clientDisconnectionCount++;
                    this.eventEmitter.emit('clientDisconnected', {clientId, timestamp: Date.now()});
                });

                this.eventEmitter.emit('clientConnected', {clientId, timestamp: Date.now()});
            });

            this.server.on('error', (error) => {
                console.error('WebSocket server error:', error);
                reject(error);
            });

            this.server.on('listening', () => {
                console.log(`WebSocket monitoring server started on ws://${this.host}:${this.port}${this.path}`);
                console.log(`Max connections: ${this.maxConnections}, Rate limit: ${this.maxMessagesPerWindow}/${this.rateLimitWindowMs}ms`);
                resolve();
            });
        });
    }

    // Check if client has exceeded rate limit
    _isClientRateLimited(clientId) {
        const now = Date.now();
        const clientLimiter = this.clientRateLimiters.get(clientId);

        if (!clientLimiter) {
            return false; // Shouldn't happen, but be safe
        }

        // Reset counter if window has passed
        if (now - clientLimiter.lastReset > this.rateLimitWindowMs) {
            clientLimiter.messageCount = 0;
            clientLimiter.lastReset = now;
        }

        // Increment count and check limit
        clientLimiter.messageCount++;
        return clientLimiter.messageCount > this.maxMessagesPerWindow;
    }

    async stop() {
        return new Promise((resolve) => {
            for (const client of this.clients) {
                client.close(1001, 'Server shutting down');
            }

            this.clients.clear();
            this.clientRateLimiters.clear();
            this.clientCapabilities.clear();

            if (this.server) {
                this.server.close(() => {
                    console.log('WebSocket monitoring server stopped');
                    resolve();
                });
            } else {
                console.log('WebSocket monitoring server stopped');
                resolve();
            }
        });
    }

    broadcastEvent(eventType, data, options = {}) {
        const message = {
            type: 'event',
            eventType,
            data,
            timestamp: Date.now(),
            ...options
        };
        this._broadcastMessage(message, eventType);
    }

    _sendToClient(client, message) {
        try {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(message));
            }
        } catch (error) {
            console.error('Error sending message to client:', error);
        }
    }

    _handleSubscription(client, message, action) {
        if (!client.subscriptions) client.subscriptions = new Set();
        
        const eventTypes = message.eventTypes ?? ['all'];
        
        if (action === 'subscribe') {
            eventTypes.forEach(type => client.subscriptions.add(type));
            this._sendToClient(client, {
                type: 'subscription_ack',
                subscribedTo: Array.from(client.subscriptions),
                timestamp: Date.now()
            });
        } else if (action === 'unsubscribe') {
            eventTypes.forEach(type => client.subscriptions.delete(type));
            this._sendToClient(client, {
                type: 'unsubscription_ack',
                unsubscribedFrom: eventTypes,
                timestamp: Date.now()
            });
        }
    }

    _handleSubscribe(client, message) {
        this._handleSubscription(client, message, 'subscribe');
    }

    _handleUnsubscribe(client, message) {
        this._handleSubscription(client, message, 'unsubscribe');
    }

    _generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getStats() {
        return {
            port: this.port,
            host: this.host,
            connections: this.clients.size,
            maxConnections: this.maxConnections,
            uptime: this.server ? Date.now() - this.metrics.startTime : 0,
            path: this.path,
            // Additional metrics for Phase 5+
            metrics: {
                messagesSent: this.metrics.messagesSent,
                messagesReceived: this.metrics.messagesReceived,
                errorCount: this.metrics.errorCount,
                clientConnectionCount: this.metrics.clientConnectionCount,
                clientDisconnectionCount: this.metrics.clientDisconnectionCount,
                currentClientCount: this.clients.size
            }
        };
    }

    // Get detailed performance metrics for Phase 5+ optimization
    getPerformanceMetrics() {
        const stats = this.getStats();
        const uptime = stats.uptime;

        return {
            ...stats.metrics,
            uptime,
            messagesPerSecond: uptime > 0 ? (stats.metrics.messagesSent / (uptime / 1000)).toFixed(2) : 0,
            connectionRate: uptime > 0 ? (stats.metrics.clientConnectionCount / (uptime / 1000)).toFixed(4) : 0,
            errorRate: stats.metrics.messagesSent > 0 ?
                ((stats.metrics.errorCount / stats.metrics.messagesSent) * 100).toFixed(4) : 0,
            connectionUtilization: (this.clients.size / this.maxConnections * 100).toFixed(2) + '%'
        };
    }

    getClients() {
        return Array.from(this.clients).map(client => ({
            id: client.clientId,
            readyState: client.readyState,
            remoteAddress: client._socket?.remoteAddress,
            subscriptions: Array.from(client.subscriptions || []),
            messageRate: this.clientRateLimiters.get(client.clientId)?.messageCount || 0
        }));
    }



    // Method to register handlers for client messages
    registerClientMessageHandler(messageType, handler) {
        if (!this.clientMessageHandlers) {
            this.clientMessageHandlers = new Map();
        }
        this.clientMessageHandlers.set(messageType, handler);
    }

    // Method to broadcast custom events (not NAR events)
    broadcastCustomEvent(eventType, data, options = {}) {
        const message = {
            type: eventType,
            data,
            timestamp: Date.now(),
            ...options
        };
        this._broadcastMessage(message, eventType);
    }

    _handleClientMessage(client, data) {
        try {
            const rawData = data.toString();
            if (!rawData.trim()) {
                this._sendToClient(client, {
                    type: 'error',
                    message: 'Empty message received'
                });
                return;
            }

            const message = JSON.parse(rawData);

            // Validate message structure
            if (!message.type || typeof message.type !== 'string') {
                this._sendToClient(client, {
                    type: 'error',
                    message: 'Invalid message format: missing or invalid type field'
                });
                return;
            }

            // Update client message count for rate limiting
            const clientId = client.clientId;
            const clientLimiter = this.clientRateLimiters.get(clientId);
            if (clientLimiter) {
                clientLimiter.messageCount = (clientLimiter.messageCount ?? 0) + 1;
            }

            // Route to appropriate handler
            this._routeMessage(client, message);
        } catch (error) {
            this.metrics.errorCount++;
            this._handleMessageError(client, error);
        }
    }

    _routeMessage(client, message) {
        const handlers = {
            'subscribe': (msg) => this._handleSubscribe(client, msg),
            'unsubscribe': (msg) => this._handleUnsubscribe(client, msg),
            'ping': () => this._sendToClient(client, {type: 'pong', timestamp: Date.now()}),
            'narseseInput': (msg) => this._handleNarseseInput(client, msg),
            'testLMConnection': (msg) => this._handleTestLMConnection(client, msg),
            'log': (msg) => this._handleClientLog(client, msg),
            'requestCapabilities': (msg) => this._handleRequestCapabilities(client, msg)
        };

        const handler = handlers[message.type] || this._handleCustomMessage.bind(this, client, message);
        handler(message);
    }

    _handleCustomMessage(client, message) {
        if (this.clientMessageHandlers?.has(message.type)) {
            const handler = this.clientMessageHandlers.get(message.type);
            if (typeof handler === 'function') {
                try {
                    handler(message, client, this);
                } catch (handlerError) {
                    this._sendHandlerError(client, message.type, handlerError);
                }
            } else {
                this._sendInvalidHandlerError(client, message.type);
            }
        } else {
            console.warn('Unknown message type:', message.type);
            this._sendToClient(client, {
                type: 'error',
                message: `Unknown message type: ${message.type}`
            });
            this.metrics.errorCount++;
        }
    }

    _handleMessageError(client, error) {
        const isSyntaxError = error instanceof SyntaxError;
        const message = isSyntaxError ? 'Invalid JSON format' : 'Error processing message';
        const errorMessage = isSyntaxError ? error.message : error.message;
        
        console.error(isSyntaxError ? 'Invalid JSON received:' : 'Error handling client message:', errorMessage);
        
        this._sendToClient(client, {
            type: 'error',
            message,
            error: errorMessage
        });
    }

    _sendHandlerError(client, messageType, handlerError) {
        console.error(`Error in handler for message type ${messageType}:`, handlerError);
        this._sendErrorMessage(client, `Handler error for ${messageType}`, handlerError.message);
        this.metrics.errorCount++;
    }

    _sendInvalidHandlerError(client, messageType) {
        console.error(`Invalid handler for message type: ${messageType}`);
        this._sendErrorMessage(client, `Invalid handler for message type: ${messageType}`);
        this.metrics.errorCount++;
    }
    
    _sendErrorMessage(client, message, error = null) {
        const response = { type: 'error', message };
        if (error) response.error = error;
        this._sendToClient(client, response);
    }

    // Handler for requesting client capabilities
    _handleRequestCapabilities(client, message) {
        const clientId = client.clientId;
        const capabilities = this.clientCapabilities.get(clientId) || [];

        this._sendToClient(client, {
            type: 'capabilities',
            data: {
                clientId,
                capabilities,
                serverVersion: '10.0.0',
                supportedMessageTypes: [
                    'narseseInput', 'testLMConnection', 'subscribe', 'unsubscribe',
                    'ping', 'log', 'requestCapabilities'
                ]
            },
            timestamp: Date.now()
        });
    }

    // Handler for narsese input messages
    async _handleNarseseInput(client, message) {
        try {
            if (!message.payload || !message.payload.input) {
                this._sendToClient(client, {
                    type: 'narseseInput',
                    payload: {
                        input: message.payload?.input || '',
                        success: false,
                        message: 'Missing input in payload'
                    }
                });
                return;
            }

            const narseseString = message.payload.input;

            // Validate that we have a NAR instance to process the input
            if (!this._nar) {
                this._sendToClient(client, {
                    type: 'narseseInput',
                    payload: {
                        input: narseseString,
                        success: false,
                        message: 'NAR instance not available'
                    }
                });
                return;
            }

            // Process the input with the NAR
            try {
                const result = await this._nar.input(narseseString);

                this._sendToClient(client, {
                    type: 'narseseInput',
                    payload: {
                        input: narseseString,
                        success: result,
                        message: result ? 'Input processed successfully' : 'Input processing failed'
                    }
                });
            } catch (error) {
                console.error('Error processing narsese input:', error);
                this._sendToClient(client, {
                    type: 'narseseInput',
                    payload: {
                        input: narseseString,
                        success: false,
                        message: `Error: ${error.message}`
                    }
                });
            }
        } catch (error) {
            console.error('Error in _handleNarseseInput:', error);
            this._sendToClient(client, {
                type: 'narseseInput',
                payload: {
                    input: message.payload?.input || '',
                    success: false,
                    message: `Internal error: ${error.message}`
                }
            });
        }
    }

    // Store reference to NAR for processing inputs
    listenToNAR(nar) {
        if (!nar || !nar.on) {
            throw new Error('NAR instance must have an on() method');
        }

        this._nar = nar;

        NAR_EVENTS.forEach(eventName => {
            nar.on(eventName, (data, metadata) => {
                this.broadcastEvent(eventName, {
                    data,
                    metadata: metadata || {},
                    timestamp: Date.now()
                });
            });
        });

        console.log('WebSocket monitor now listening to NAR events');
    }

    // Handler for testing LM connection
    async _handleTestLMConnection(client, message) {
        try {
            const config = message.payload;

            if (!config || !config.provider) {
                return this._sendToClient(client, this._createTestResult(false, 'Missing configuration or provider in payload'));
            }

            // Check if we have access to the LM instance in the NAR
            if (!this._nar || !this._nar.lm) {
                return this._sendToClient(client, this._createTestResult(false, 'LM component not available'));
            }

            try {
                // Try to create a test provider based on the configuration
                const testProvider = await this._createTestProvider(config);

                // Try to generate a test response
                const testResponse = await testProvider.generateText('Hello, can you respond to this test message?', {
                    maxTokens: 20
                });

                // Send success response
                this._sendToClient(client, this._createTestResult(true,
                    `Successfully connected to ${config.name || config.provider} provider`,
                    {
                        model: config.model,
                        baseURL: config.baseURL,
                        responseSample: testResponse.substring(0, 100) + (testResponse.length > 100 ? '...' : '')
                    }
                ));
            } catch (error) {
                console.error('LM connection test failed:', error);
                this._sendToClient(client, this._createTestResult(false,
                    `Connection failed: ${error.message || 'Unknown error'}`,
                    {error: error.message}
                ));
            }
        } catch (error) {
            console.error('Error in _handleTestLMConnection:', error);
            this._sendToClient(client, this._createTestResult(false, `Internal error: ${error.message}`));
        }
    }

    // Helper method to create standardized test result messages
    _createTestResult(success, message, additionalData = {}) {
        return {
            type: 'testLMConnection',
            success,
            message,
            ...additionalData
        };
    }

    // Helper method to create a test provider based on configuration
    async _createTestProvider(config) {
        const providerType = config.provider;

        switch (providerType) {
            case 'openai':
                const {LangChainProvider} = await import('../lm/LangChainProvider.js');
                return new LangChainProvider({
                    provider: 'openai',
                    modelName: config.model,
                    apiKey: config.apiKey,
                    temperature: config.temperature,
                    maxTokens: config.maxTokens
                });

            case 'ollama':
                const {LangChainProvider: OllamaProvider} = await import('../lm/LangChainProvider.js');
                return new OllamaProvider({
                    provider: 'ollama',
                    modelName: config.model,
                    baseURL: config.baseURL,
                    temperature: config.temperature,
                    maxTokens: config.maxTokens
                });

            case 'anthropic':
                // Use a dummy provider for Anthropic since we don't have a real one
                const {DummyProvider} = await import('../lm/DummyProvider.js');
                return new DummyProvider({
                    id: 'test-anthropic',
                    responseTemplate: `Anthropic test response for: {prompt}`
                });

            default:
                // For other providers, use a dummy provider
                const {DummyProvider: GenericDummyProvider} = await import('../lm/DummyProvider.js');
                return new GenericDummyProvider({
                    id: `test-${providerType}`,
                    responseTemplate: `Test response for ${providerType}: {prompt}`
                });
        }
    }

    // Handler for client log messages
    _handleClientLog(client, message) {
        // Log the client message to server console for debugging
        const logMessage = `[CLIENT-${client.clientId}] ${message.level.toUpperCase()}: ${message.data.join(' ')}`;
        console.log(logMessage);

        // Optionally broadcast this log to other connected clients or store for debugging
        if (message.level === 'error' || message.level === 'warn') {
            // Broadcast error/warning logs to all clients for debugging purposes
            this.broadcastEvent('clientLog', {
                level: message.level,
                clientId: client.clientId,
                data: message.data,
                timestamp: message.timestamp,
                meta: message.meta
            });
        }
    }

    _broadcastMessage(message, eventType) {
        try {
            // Early returns for optimization
            if (!this._shouldBroadcast(message, eventType)) return;

            // Only process if we have clients to send to
            if (this.clients.size === 0) return;

            const jsonMessage = JSON.stringify(message);
            let sentCount = 0;

            for (const client of this.clients) {
                if (this._shouldSendToClient(client, message, eventType) && client.readyState === client.OPEN) {
                    sentCount += this._sendToClientSafe(client, jsonMessage, message.type);
                }
            }

            // Update metrics
            this.metrics.messagesSent += sentCount;
        } catch (error) {
            console.error(`Error broadcasting ${message.type}:`, error);
            this.metrics.errorCount++;
        }
    }
    
    _shouldBroadcast(message, eventType) {
        // Rate limiting to prevent flooding
        const now = Date.now();
        const lastBroadcast = this.broadcastRateLimiter.lastBroadcastTime.get(eventType) ?? 0;
        if (now - lastBroadcast < this.broadcastRateLimiter.minInterval) {
            return false; // Skip this broadcast to respect rate limit
        }
        this.broadcastRateLimiter.lastBroadcastTime.set(eventType, now);

        if (this.eventFilter && typeof this.eventFilter === 'function') {
            if (!this.eventFilter(eventType, message.data)) {
                return false;
            }
        }
        
        return true;
    }
    
    _shouldSendToClient(client, message, eventType) {
        // Apply subscription filtering - only for non-event type messages
        return message.type === 'event' || 
            !client.subscriptions || 
            client.subscriptions.has('all') || 
            client.subscriptions.has(eventType);
    }
    
    _sendToClientSafe(client, jsonMessage, messageType) {
        try {
            client.send(jsonMessage, {binary: false, compress: true}, (error) => {
                if (error) this._handleClientSendError(client, messageType, error);
            });
            return 1;
        } catch (sendError) {
            this._handleClientSendError(client, messageType, sendError);
            return 0;
        }
    }
    
    _handleClientSendError(client, messageType, error) {
        console.error(`Error sending ${messageType} to client:`, error);
        // Remove problematic client
        this.clients.delete(client);
        try {
            client.close(1011, 'Sending error');
        } catch (e) {
            // If client is already closed, just ignore
        }
    }

    on(event, listener) {
        this.eventEmitter.on(event, listener);
    }

    off(event, listener) {
        this.eventEmitter.off(event, listener);
    }
}

export {WebSocketMonitor};