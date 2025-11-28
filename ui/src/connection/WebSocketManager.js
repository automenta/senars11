import {Config} from '../config/Config.js';
import {Logger} from '../logging/Logger.js';
import {WebSocketConnectionError} from '../errors/CustomErrors.js';

/**
 * WebSocketManager handles all WebSocket connections and reconnection logic
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

        // Bind methods to preserve 'this' context
        this._onOpen = this._onOpen.bind(this);
        this._onClose = this._onClose.bind(this);
        this._onError = this._onError.bind(this);
        this._onMessage = this._onMessage.bind(this);
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        try {
            const wsUrl = Config.getWebSocketUrl();
            this.ws = new WebSocket(wsUrl);

            // Set up event handlers
            this.ws.onopen = this._onOpen;
            this.ws.onclose = this._onClose;
            this.ws.onerror = this._onError;
            this.ws.onmessage = this._onMessage;
        } catch (error) {
            this._handleConnectionError(error);
        }
    }

    /**
     * Handle WebSocket open event
     */
    _onOpen() {
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.logger.log('Connected to SeNARS server', 'success', '🌐');
        this.notifyStatusChange('connected');
    }

    /**
     * Handle WebSocket close event
     */
    _onClose() {
        this.connectionStatus = 'disconnected';
        this.logger.log('Disconnected from server', 'warning', '🔌');
        this.notifyStatusChange('disconnected');

        // Attempt to reconnect after delay, unless we've reached the max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
            this.logger.log(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`, 'error', '🚨');
        }
    }

    /**
     * Handle WebSocket error event
     */
    _onError(error) {
        this.connectionStatus = 'error';
        this.logger.log('WebSocket connection error', 'error', '🚨');
        this.notifyStatusChange('error');
    }

    /**
     * Handle WebSocket message event
     */
    _onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        } catch (e) {
            this.logger.log(`Invalid message format: ${event.data}`, 'error', '🚨');
        }
    }

    /**
     * Handle connection errors
     */
    _handleConnectionError(error) {
        this.connectionStatus = 'error';
        this.logger.log('Failed to create WebSocket', 'error', '🚨');

        if (error instanceof WebSocketConnectionError) {
            throw error;
        } else {
            throw new WebSocketConnectionError(error.message, 'WEBSOCKET_CREATION_FAILED');
        }
    }

    /**
     * Send a message through the WebSocket
     */
    sendMessage(type, payload) {
        if (this.isConnected()) {
            const messageStr = JSON.stringify({type, payload});
            this.ws.send(messageStr);
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
     * Handle incoming messages
     */
    handleMessage(message) {
        if (!message) return; // Early return if message is null/undefined

        // Handle batch events
        if (message.type === 'eventBatch') {
            this._handleEventBatch(message);
            return;
        }

        // Filter out noisy events
        if (message.type === 'cycle.start' || message.type === 'cycle.complete') {
            return; // Too noisy for main log
        }

        this._notifyMessageHandlers(message);
    }

    /**
     * Handle event batch messages
     */
    _handleEventBatch(message) {
        const events = message.data || [];
        this.logger.log(`Received batch of ${events.length} events`, 'debug', '📦');

        // Process events in batch to improve performance with many messages
        const batchLimit = Config.getConstants().MESSAGE_BATCH_SIZE;
        for (let i = 0; i < events.length; i += batchLimit) {
            const batch = events.slice(i, i + batchLimit);
            this.processBatch(batch);
        }
    }

    /**
     * Process a batch of events
     */
    processBatch(batch) {
        // Use for-of loop instead of forEach for better performance in hot paths
        for (const event of batch) {
            // Process individual events using internal logic to avoid double-handling
            this.handleMessage({
                type: event.type,
                payload: event.data,
                timestamp: event.timestamp
            });
        }
    }

    /**
     * Notify all message handlers for a specific message
     */
    _notifyMessageHandlers(message) {
        const specificHandlers = this.messageHandlers.get(message.type) ?? [];
        const generalHandlers = this.messageHandlers.get('*') ?? [];

        // Process specific handlers first, then general handlers
        [...specificHandlers, ...generalHandlers].forEach((handler, index) => {
            const handlerType = index < specificHandlers.length ? message.type : '*';
            this.tryHandleMessage(handler, message, handlerType);
        });
    }

    /**
     * Safely execute a handler function with error context
     */
    tryExecuteHandler(handler, arg, handlerType, message = null) {
        if (!handler || typeof handler !== 'function') return; // Early return for invalid handlers

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
    tryHandleMessage(handler, message, handlerType) {
        const context = handlerType === '*' ? 'general' : `message handler for ${message.type}`;
        this.tryExecuteHandler(handler, message, context, message);
    }

    /**
     * Notify status changes
     */
    notifyStatusChange(status) {
        const statusHandlers = this.messageHandlers.get('connection.status') ?? [];
        for (const handler of statusHandlers) { // Use for-of instead of forEach for better performance
            this.tryExecuteHandler(handler, status, 'status handler');
        }
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