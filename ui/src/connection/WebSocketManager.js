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

        // Queue for processing messages to avoid blocking the main thread
        this.eventQueue = [];
        this.isProcessingQueue = false;
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
                this.notifyStatusChange('connected');
            };

            this.ws.onclose = () => {
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
            };

            this.ws.onerror = (error) => {
                this.connectionStatus = 'error';
                this.logger.log('WebSocket connection error', 'error', '🚨');
                this.notifyStatusChange('error');
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
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
     * Send a message through the WebSocket
     */
    sendMessage(type, payload) {
        if (this.isConnected()) {
            // Use a more efficient message format to avoid object creation in hot paths
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
     * Handle incoming messages by adding them to a queue
     */
    handleMessage(message) {
        if (!message) return; // Early return if message is null/undefined

        if (message.type === 'eventBatch') {
            const events = message.data || [];
            this.logger.log(`Received batch of ${events.length} events`, 'debug', '📦');

            // Unpack batch and queue individual events
            for (const event of events) {
                this.eventQueue.push({
                    type: event.type,
                    payload: event.data,
                    timestamp: event.timestamp
                });
            }
        } else {
            // Queue single message
            this.eventQueue.push(message);
        }

        // Trigger queue processing
        this.processQueue();
    }

    /**
     * Process the event queue in chunks to avoid blocking the main thread
     */
    processQueue() {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;

        const processChunk = () => {
            const start = Date.now();
            const TIME_BUDGET = 12; // ms (target ~60fps, leaving time for rendering)

            try {
                while (this.eventQueue.length > 0 && (Date.now() - start < TIME_BUDGET)) {
                    const message = this.eventQueue.shift();
                    this._dispatchMessage(message);
                }
            } catch (err) {
                console.error('Error processing message queue:', err);
            }

            if (this.eventQueue.length > 0) {
                // Schedule next chunk
                setTimeout(processChunk, 0);
            } else {
                this.isProcessingQueue = false;
            }
        };

        processChunk();
    }

    /**
     * Internal method to dispatch a single message to handlers
     */
    _dispatchMessage(message) {
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
        const statusHandlers = this.messageHandlers.get('connection.status') || [];
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
