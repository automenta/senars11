import {WebSocketServer} from 'ws';
import {EventEmitter} from 'events';

const DEFAULT_OPTIONS = Object.freeze({
    port: 8080,
    host: 'localhost',
    path: '/ws',
    maxConnections: 10
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
    'system.loaded'
]);

class WebSocketMonitor {
    constructor(options = {}) {
        this.port = options.port || DEFAULT_OPTIONS.port;
        this.host = options.host || DEFAULT_OPTIONS.host;
        this.path = options.path || DEFAULT_OPTIONS.path;
        this.maxConnections = options.maxConnections || DEFAULT_OPTIONS.maxConnections;
        this.eventFilter = options.eventFilter || null;
        this.clients = new Set();
        this.eventEmitter = new EventEmitter();
        this.server = null;
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server = new WebSocketServer({
                port: this.port,
                host: this.host,
                path: this.path
            });

            this.server.on('connection', (ws, request) => {
                if (this.clients.size >= this.maxConnections) {
                    ws.close(1013, 'Server busy, too many connections');
                    return;
                }

                this.clients.add(ws);
                const clientId = this._generateClientId();
                ws.clientId = clientId;

                this._sendToClient(ws, {
                    type: 'connection',
                    data: {
                        clientId,
                        timestamp: Date.now(),
                        message: 'Connected to SeNARS monitoring server'
                    }
                });

                ws.on('message', (data) => this._handleClientMessage(ws, data));
                ws.on('close', () => {
                    this.clients.delete(ws);
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
                resolve();
            });
        });
    }

    async stop() {
        return new Promise((resolve) => {
            for (const client of this.clients) {
                client.close(1001, 'Server shutting down');
            }

            this.clients.clear();

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
        try {
            if (this.eventFilter && typeof this.eventFilter === 'function') {
                if (!this.eventFilter(eventType, data)) {
                    return;
                }
            }

            const message = {
                type: 'event',
                eventType,
                data,
                timestamp: Date.now(),
                ...options
            };

            const jsonMessage = JSON.stringify(message);

            for (const client of this.clients) {
                if (client.readyState === client.OPEN) {
                    client.send(jsonMessage);
                }
            }
        } catch (error) {
            console.error('Error broadcasting event:', error);
        }
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



    _handleSubscribe(client, message) {
        this._sendToClient(client, {
            type: 'subscription_ack',
            subscribedTo: message.eventTypes || 'all',
            timestamp: Date.now()
        });
    }

    _handleUnsubscribe(client, message) {
        this._sendToClient(client, {
            type: 'unsubscription_ack',
            unsubscribedFrom: message.eventTypes || 'all',
            timestamp: Date.now()
        });
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
            uptime: this.server ? Date.now() - this.server._handle.fd : 0,
            path: this.path
        };
    }

    getClients() {
        return Array.from(this.clients).map(client => ({
            id: client.clientId,
            readyState: client.readyState,
            remoteAddress: client._socket?.remoteAddress
        }));
    }

    listenToNAR(nar) {
        if (!nar || !nar.on) {
            throw new Error('NAR instance must have an on() method');
        }

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

    // Method to register handlers for client messages
    registerClientMessageHandler(messageType, handler) {
        if (!this.clientMessageHandlers) {
            this.clientMessageHandlers = new Map();
        }
        this.clientMessageHandlers.set(messageType, handler);
    }

    // Method to broadcast custom events (not NAR events)
    broadcastCustomEvent(eventType, data, options = {}) {
        try {
            if (this.eventFilter && typeof this.eventFilter === 'function') {
                if (!this.eventFilter(eventType, data)) {
                    return;
                }
            }

            const message = {
                type: eventType,
                data,
                timestamp: Date.now(),
                ...options
            };

            const jsonMessage = JSON.stringify(message);

            for (const client of this.clients) {
                if (client.readyState === client.OPEN) {
                    client.send(jsonMessage);
                }
            }
        } catch (error) {
            console.error('Error broadcasting custom event:', error);
        }
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

            switch (message.type) {
                case 'subscribe':
                    this._handleSubscribe(client, message);
                    break;
                case 'unsubscribe':
                    this._handleUnsubscribe(client, message);
                    break;
                case 'ping':
                    this._sendToClient(client, {type: 'pong', timestamp: Date.now()});
                    break;
                case 'narseseInput':
                    this._handleNarseseInput(client, message);
                    break;
                case 'testLMConnection':
                    this._handleTestLMConnection(client, message);
                    break;
                case 'log':
                    this._handleClientLog(client, message);
                    break;
                default:
                    // Check if this is a custom client message type
                    if (this.clientMessageHandlers && this.clientMessageHandlers.has(message.type)) {
                        const handler = this.clientMessageHandlers.get(message.type);
                        // Ensure handler exists and is a function
                        if (typeof handler === 'function') {
                            try {
                                handler(message);
                            } catch (handlerError) {
                                console.error(`Error in handler for message type ${message.type}:`, handlerError);
                                this._sendToClient(client, {
                                    type: 'error',
                                    message: `Handler error for ${message.type}`,
                                    error: handlerError.message
                                });
                            }
                        } else {
                            console.error(`Invalid handler for message type: ${message.type}`);
                            this._sendToClient(client, {
                                type: 'error',
                                message: `Invalid handler for message type: ${message.type}`
                            });
                        }
                    } else {
                        console.warn('Unknown message type:', message.type);
                        this._sendToClient(client, {
                            type: 'error',
                            message: `Unknown message type: ${message.type}`
                        });
                    }
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                console.error('Invalid JSON received:', error.message);
                this._sendToClient(client, {
                    type: 'error',
                    message: 'Invalid JSON format',
                    error: error.message
                });
            } else {
                console.error('Error handling client message:', error);
                this._sendToClient(client, {
                    type: 'error',
                    message: 'Error processing message',
                    error: error.message
                });
            }
        }
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
                    { model: config.model, baseURL: config.baseURL, responseSample: testResponse.substring(0, 100) + (testResponse.length > 100 ? '...' : '') }
                ));
            } catch (error) {
                console.error('LM connection test failed:', error);
                this._sendToClient(client, this._createTestResult(false, 
                    `Connection failed: ${error.message || 'Unknown error'}`, 
                    { error: error.message }
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
        
        switch(providerType) {
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

    on(event, listener) {
        this.eventEmitter.on(event, listener);
    }

    off(event, listener) {
        this.eventEmitter.off(event, listener);
    }
}

export {WebSocketMonitor};