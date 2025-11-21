import {Config} from '../config/Config.js';
import {Logger} from '../logging/Logger.js';
import {WebSocketConnectionError} from '../errors/CustomErrors.js';

/**
 * WebSocketManager handles all WebSocket connections and reconnection logic
 * Now with Session Management support.
 */
export class WebSocketManager {
    constructor() {
        this.ws = null;
        this.connectionStatus = 'disconnected';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = Config.getConstants().MAX_RECONNECT_ATTEMPTS;
        this.reconnectDelay = Config.getConstants().RECONNECT_DELAY;
        this.messageHandlers = new Map();
        this.logger = new Logger();
        this.sessionId = null; // Current Session ID
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        try {
            const wsUrl = Config.getWebSocketUrl();
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.connectionStatus = 'connected';
                this.reconnectAttempts = 0;
                this.logger.log('Connected to SeNARS server', 'success', '🌐');
                this._notifyStatusChange('connected');

                // On successful connection, ask to list sessions or create one if none active
                // For now, we rely on server greeting or manually requesting
            };

            this.ws.onclose = () => {
                this.connectionStatus = 'disconnected';
                this.logger.log('Disconnected from server', 'warning', '🔌');
                this._notifyStatusChange('disconnected');
                this.sessionId = null;

                // Attempt to reconnect after delay, unless we've reached the max attempts
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.connect(), this.reconnectDelay);
                } else {
                    this.logger.log(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`, 'error', '🚨');
                }
            };

            this.ws.onerror = (error) => {
                this.connectionStatus = 'error';
                this.logger.log('WebSocket connection error', 'error', '🚨');
                this._notifyStatusChange('error');
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this._handleMessage(message);
                } catch (e) {
                    this.logger.log(`Invalid message format: ${event.data}`, 'error', '🚨');
                }
            };
        } catch (error) {
            this.connectionStatus = 'error';
            this.logger.log('Failed to create WebSocket', 'error', '🚨');
            if (error instanceof WebSocketConnectionError) {
                throw error;
            } else {
                throw new WebSocketConnectionError(error.message, 'WEBSOCKET_CREATION_FAILED');
            }
        }
    }

    /**
     * Create a new session on the server
     */
    createSession(id = null, config = {}) {
        this.sendMessage('session/create', { sessionId: id, config });
    }

    /**
     * Connect to an existing session
     */
    connectToSession(sessionId) {
        this.sendMessage('session/connect', { sessionId });
    }

    /**
     * List available sessions
     */
    listSessions() {
        this.sendMessage('session/list', {});
    }

    /**
     * Send a message through the WebSocket
     */
    sendMessage(type, payload) {
        if (this.isConnected()) {
            const message = {type, payload};
            // If it's a session command, it has slightly different structure in server (type='session/create')
            // But here we just pass it as type.
            // If payload is separate, wrap it?
            // My server impl expects `type: 'session/create', sessionId: ...`
            // So we need to spread payload if type is session/*

            if (type.startsWith('session/')) {
                // Allow payload to merge into top level for session commands as per server impl
                const sessionMsg = { type, ...payload };
                this.ws.send(JSON.stringify(sessionMsg));
            } else {
                this.ws.send(JSON.stringify(message));
            }

            return true;
        }
        return false;
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Subscribe to messages of a specific type
     */
    subscribe(type, handler) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type).push(handler);
    }

    /**
     * Unsubscribe from messages of a specific type
     */
    unsubscribe(type, handler) {
        if (this.messageHandlers.has(type)) {
            const handlers = this.messageHandlers.get(type);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Get current connection status
     */
    getConnectionStatus() {
        return this.connectionStatus;
    }

    /**
     * Private method to handle incoming messages
     */
    _handleMessage(message) {
        // Handle batch events
        if (message.type === 'eventBatch') {
            const events = message.data || [];
            this.logger.log(`Received batch of ${events.length} events`, 'debug', '📦');

            // Process events in batch to improve performance with many messages
            const batchLimit = Config.getConstants().MESSAGE_BATCH_SIZE;
            for (let i = 0; i < events.length; i += batchLimit) {
                const batch = events.slice(i, i + batchLimit);
                this._processBatch(batch);
            }
            return;
        }

        // Handle Session Handshakes
        if (message.type === 'session/created' || message.type === 'session/connected') {
            this.sessionId = message.sessionId;
            this.logger.log(`Active Session: ${this.sessionId}`, 'success', '🔑');
            this._notifyStatusChange('session_active');
        }

        if (message.type === 'connection' && message.data && message.data.sessionId) {
             this.sessionId = message.data.sessionId;
             this.logger.log(`Active Session: ${this.sessionId}`, 'success', '🔑');
        }

        // Filter out noisy events
        if (message.type === 'cycle.start' || message.type === 'cycle.complete') {
            return; // Too noisy for main log
        }

        // Notify all handlers for this message type and general handlers
        const specificHandlers = this.messageHandlers.get(message.type) || [];
        const generalHandlers = this.messageHandlers.get('*') || [];

        // Process specific handlers first, then general handlers
        [...specificHandlers, ...generalHandlers].forEach((handler, index) => {
            const handlerType = index < specificHandlers.length ? message.type : '*';
            this._tryHandleMessage(handler, message, handlerType);
        });
    }

    /**
     * Process a batch of events
     */
    _processBatch(batch) {
        const processBatch = () => {
            for (const event of batch) {
                // Reuse existing _handleMessage method for individual events
                this._handleMessage({
                    type: event.type,
                    payload: event.data,
                    timestamp: event.timestamp
                });
            }
        };

        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            window.requestAnimationFrame(processBatch);
        } else {
            // Fallback for environments without requestAnimationFrame
            processBatch();
        }
    }

    /**
     * Safely execute a handler function with error context
     */
    _tryExecuteHandler(handler, arg, handlerType, message = null) {
        try {
            handler(arg);
        } catch (error) {
            const detailedMsg = message
                ? `Error in ${handlerType}: ${error.message}. Message details: ${JSON.stringify(message, null, 2)}`
                : `Error in ${handlerType}: ${error.message}`;
            this.logger.log(detailedMsg, 'error', '🚨');
            console.error(`WebSocketManager ${handlerType} error:`, error);
        }
    }

    /**
     * Safely execute a message handler with error handling
     */
    _tryHandleMessage(handler, message, handlerType) {
        const context = handlerType === '*' ? 'general' : `message handler for ${message.type}`;
        this._tryExecuteHandler(handler, message, context, message);
    }

    /**
     * Private method to notify status changes
     */
    _notifyStatusChange(status) {
        const statusHandlers = this.messageHandlers.get('connection.status') || [];
        statusHandlers.forEach(handler => {
            this._tryExecuteHandler(handler, status, 'status handler');
        });
    }

    /**
     * Close the WebSocket connection
     */
    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}
