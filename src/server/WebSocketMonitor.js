import {WebSocketServer} from 'ws';
import {EventEmitter} from 'events';
import {ClientMessageHandlers} from './ClientMessageHandlers.js';
import {WEBSOCKET_CONFIG, NAR_EVENTS, DEFAULT_CLIENT_CAPABILITIES} from '../config/constants.js';

const DEFAULT_OPTIONS = Object.freeze({
    port: WEBSOCKET_CONFIG.defaultPort,
    host: WEBSOCKET_CONFIG.defaultHost,
    path: WEBSOCKET_CONFIG.defaultPath,
    maxConnections: WEBSOCKET_CONFIG.maxConnections, // Increased default for better scalability
    minBroadcastInterval: WEBSOCKET_CONFIG.minBroadcastInterval, // Reduced for better real-time experience
    messageBufferSize: WEBSOCKET_CONFIG.messageBufferSize, // Max size for message buffer
    rateLimitWindowMs: WEBSOCKET_CONFIG.rateLimitWindowMs, // 1 second window for rate limiting
    maxMessagesPerWindow: WEBSOCKET_CONFIG.maxMessagesPerWindow // Max messages per window per client
});

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

        // Initialize message handlers
        this.messageHandlers = new ClientMessageHandlers(this);

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
                maxPayload: WEBSOCKET_CONFIG.maxPayload // 1MB max payload
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
                        capabilities: DEFAULT_CLIENT_CAPABILITIES
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
        this._broadcastMessage({ type: 'event', eventType, data, timestamp: Date.now(), ...options }, eventType);
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
        this._broadcastMessage({ type: eventType, data, timestamp: Date.now(), ...options }, eventType);
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
            'subscribe': (msg) => this.messageHandlers.handleSubscribe(client, msg),
            'unsubscribe': (msg) => this.messageHandlers.handleUnsubscribe(client, msg),
            'ping': () => this.messageHandlers.handlePing(client),
            'narseseInput': (msg) => this.messageHandlers.handleNarseseInput(client, msg),
            'testLMConnection': (msg) => this.messageHandlers.handleTestLMConnection(client, msg),
            'log': (msg) => this.messageHandlers.handleLog(client, msg),
            'requestCapabilities': (msg) => this.messageHandlers.handleRequestCapabilities(client, msg)
        };

        (handlers[message.type] || this._handleCustomMessage.bind(this, client, message))(message);
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
        const errorMsg = isSyntaxError ? 'Invalid JSON format' : 'Error processing message';
        const errorMessage = isSyntaxError ? error.message : error.message;
        
        console.error(isSyntaxError ? 'Invalid JSON received:' : 'Error handling client message:', errorMessage);
        
        this._sendToClient(client, { type: 'error', message: errorMsg, error: errorMessage });
    }

    _sendHandlerError(client, messageType, handlerError) {
        console.error(`Error in handler for message type ${messageType}:`, handlerError);
        this._sendError(client, `Handler error for ${messageType}`, handlerError.message);
        this.metrics.errorCount++;
    }

    _sendInvalidHandlerError(client, messageType) {
        console.error(`Invalid handler for message type: ${messageType}`);
        this._sendError(client, `Invalid handler for message type: ${messageType}`);
        this.metrics.errorCount++;
    }
    
    _sendError(client, message, error = null) {
        this._sendToClient(client, { type: 'error', message, error });
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