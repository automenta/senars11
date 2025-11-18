import configManager from './config/config-manager.js';
import Logger from './utils/logger.js';
import errorHandler from './utils/error-handler.js';
import MessageFormatter from './utils/message-formatter.js';
import { memoryManager } from './utils/memory-manager.js';

class WebSocketService {
    constructor(url = null, store = null) {
        // Use provided URL, or get dynamic URL
        this.url = url ?? this._getWebSocketUrl();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = configManager.getMaxReconnectAttempts();
        this.reconnectDelay = configManager.getReconnectDelay();
        this.eventListeners = new Map();
        this.isReconnecting = false;
        this.shouldReconnect = true;
        this.store = store;

        // Add timer tracking for memory management
        this._scheduledReconnectTimer = null;
    }

    _getWebSocketUrl() {
        // Try to use the page's current hostname instead of hardcoded localhost
        if (typeof window !== 'undefined' && window.location?.hostname) {
            return `ws://${window.location.hostname}:${configManager.getWebSocketPort()}${configManager.getWebSocketConfig().defaultPath}`;
        }
        // Fallback to config value if in non-browser environment
        return `ws://${configManager.getWebSocketConfig().defaultHost}:${configManager.getWebSocketPort()}${configManager.getWebSocketConfig().defaultPath}`;
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
                this._setupEventHandlers(resolve, reject);
            } catch (error) {
                errorHandler.handleError(error, { url: this.url, context: 'WebSocket creation' });
                reject(error);
            }
        });
    }

    _setupEventHandlers(resolve, reject) {
        // Define event handlers with structured approach
        const eventHandlers = {
            'onopen': () => {
                Logger.info('WebSocket connected', { url: this.url });
                this.reconnectAttempts = 0;
                this.isReconnecting = false;
                this._emit('open');
                resolve();
            },
            'onclose': (event) => {
                Logger.info('WebSocket closed', { code: event.code, reason: event.reason });
                this._emit('close', event);
                this._handleWebSocketClose(event);
            },
            'onerror': (error) => {
                errorHandler.handleError(error, { url: this.url, context: 'WebSocket connection' });
                this._emit('error', error);
                this._handleWebSocketError(error);
                reject(error);
            },
            'onmessage': (event) => {
                this._handleWebSocketMessage(event);
            }
        };

        // Assign handlers to websocket instance
        Object.entries(eventHandlers).forEach(([event, handler]) => {
            this.ws[event] = handler;
        });
    }

    _handleWebSocketClose(event) {
        if (this.store) {
            this.store.dispatch({ type: 'SET_ERROR', payload: `WebSocket closed: ${event.reason}` });
        }
        if (this.shouldReconnect && event.code !== 1000) {
            this._scheduleReconnect();
        }
    }

    _handleWebSocketError(error) {
        if (this.store) {
            this.store.dispatch({ type: 'SET_ERROR', payload: 'WebSocket connection error.' });
        }
    }

    _handleWebSocketMessage(event) {
        try {
            const data = MessageFormatter.formatIncomingMessage(event.data);
            this._emit('message', data);
        } catch (parseError) {
            errorHandler.handleError(parseError, {
                raw: event.data,
                context: 'WebSocket message parsing'
            });
            this._emit('error', {
                type: 'PARSE_ERROR',
                message: parseError.message,
                raw: event.data
            });
        }
    }

    disconnect() {
        this.shouldReconnect = false;

        // Close WebSocket connection
        if (this.ws) {
            this.ws.close(1000, 'Client requested disconnect');
            this.ws = null;
        }

        // Clear any scheduled reconnect timer
        this._clearScheduledReconnectTimer();
    }

    reconnect() {
        this.disconnect();
        this.shouldReconnect = true;
        return this.connect();
    }

    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this._handleMaxReconnectAttempts();
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;
        const delay = this._calculateReconnectDelay();

        Logger.info('Scheduling reconnection', {
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            delayMs: delay
        });

        this._clearScheduledReconnectTimer();

        this._scheduledReconnectTimer = memoryManager.registerTimer(
            setTimeout(() => this._attemptReconnect(), delay)
        );
    }

    _handleMaxReconnectAttempts() {
        errorHandler.handleError(new Error('Max reconnection attempts reached'), {
            attempts: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            context: 'WebSocket reconnection'
        });
        this._emit('error', { type: 'MAX_RECONNECT_ATTEMPTS' });
    }

    _calculateReconnectDelay() {
        return Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    }

    _clearScheduledReconnectTimer() {
        if (this._scheduledReconnectTimer) {
            clearTimeout(this._scheduledReconnectTimer);
            this._scheduledReconnectTimer = null;
        }
    }

    _attemptReconnect() {
        if (this.shouldReconnect) {
            Logger.info('Attempting to reconnect');
            this.connect().catch(error => {
                errorHandler.handleError(error, { context: 'WebSocket reconnection' });
                this._scheduleReconnect();
            });
        }
        // Remove the timer reference after it executes
        this._scheduledReconnectTimer = null;
    }

    sendMessage(type, payload) {
        if (!this._isConnected()) {
            Logger.error('WebSocket not connected, cannot send message', {
                readyState: this.ws?.readyState,
                type
            });
            return false;
        }

        try {
            const message = MessageFormatter.formatOutgoingMessage(type, payload);
            this.ws.send(JSON.stringify(message));
            this._emit('outgoingMessage', message);
            return true;
        } catch (error) {
            this._handleSendMessageError(error, type, payload);
            return false;
        }
    }

    _handleSendMessageError(error, type, payload) {
        errorHandler.handleError(error, {
            type,
            payload,
            context: 'sendMessage'
        });
        this._emit('error', { type: 'SEND_ERROR', message: error.message });
    }

    sendCommand(command) {
        try {
            const message = MessageFormatter.createCommandMessage(command);
            if (!this._isConnected()) {
                Logger.error('WebSocket not connected, cannot send command', {
                    readyState: this.ws?.readyState,
                    command
                });
                return false;
            }

            this.ws.send(JSON.stringify(message));
            this._emit('outgoingMessage', message);
            return true;
        } catch (error) {
            this._handleSendCommandError(error, command);
            return false;
        }
    }

    _handleSendCommandError(error, command) {
        errorHandler.handleError(error, {
            command,
            context: 'sendCommand'
        });
        this._emit('error', { type: 'SEND_ERROR', message: error.message });
    }

    subscribe(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }

    unsubscribe(eventType, callback) {
        if (this.eventListeners.has(eventType)) {
            const listeners = this.eventListeners.get(eventType);
            const index = listeners.indexOf(callback);
            if (index > -1) listeners.splice(index, 1);
        }
    }

    _emit(eventType, data) {
        const listeners = this.eventListeners.get(eventType);
        listeners?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                errorHandler.handleError(error, {
                    eventType,
                    context: 'WebSocket event listener'
                });
            }
        });
    }

    _isConnected() {
        return this.ws && this.ws.readyState === this.ws.OPEN;
    }

    isConnected() {
        return this._isConnected();
    }

    isConnecting() {
        return this.ws && this.ws.readyState === this.ws.CONNECTING;
    }

    isReconnecting() {
        return this.isReconnecting;
    }

    /**
     * Complete cleanup of the WebSocket service and all associated resources
     */
    cleanup() {
        // Disconnect the WebSocket
        this.disconnect();

        // Clear all event listeners
        this.eventListeners.clear();
    }
}

export default WebSocketService;