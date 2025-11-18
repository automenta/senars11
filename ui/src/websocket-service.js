import configManager from './config/config-manager.js';
import Logger from './utils/logger.js';
import errorHandler from './utils/error-handler.js';
import MessageFormatter from './utils/message-formatter.js';

class WebSocketService {
    constructor(url = null, store = null) {
        // Use provided URL, or get dynamic URL
        this.url = url || this._getWebSocketUrl();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = configManager.getMaxReconnectAttempts();
        this.reconnectDelay = configManager.getReconnectDelay();
        this.eventListeners = new Map();
        this.isReconnecting = false;
        this.shouldReconnect = true;
        this.store = store;
    }

    _getWebSocketUrl() {
        // Try to use the page's current hostname instead of hardcoded localhost
        if (typeof window !== 'undefined' && window.location && window.location.hostname) {
            return `ws://${window.location.hostname}:${configManager.getWebSocketPort()}${configManager.getWebSocketConfig().defaultPath}`;
        }
        // Fallback to config value if in non-browser environment
        return `ws://${configManager.getWebSocketConfig().defaultHost}:${configManager.getWebSocketPort()}${configManager.getWebSocketConfig().defaultPath}`;
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);

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
                        if (this.store) {
                            this.store.dispatch({ type: 'SET_ERROR', payload: `WebSocket closed: ${event.reason}` });
                        }
                        if (this.shouldReconnect && event.code !== 1000) {
                            this._scheduleReconnect();
                        }
                    },
                    'onerror': (error) => {
                        errorHandler.handleError(error, { url: this.url, context: 'WebSocket connection' });
                        this._emit('error', error);
                        if (this.store) {
                            this.store.dispatch({ type: 'SET_ERROR', payload: 'WebSocket connection error.' });
                        }
                        reject(error);
                    },
                    'onmessage': (event) => {
                        try {
                            const data = MessageFormatter.formatIncomingMessage(event.data);
                            this._emit('message', data);
                        } catch (parseError) {
                            errorHandler.handleError(parseError, {
                                raw: event.data,
                                context: 'WebSocket message parsing'
                            });
                            this._emit('error', { type: 'PARSE_ERROR', message: parseError.message, raw: event.data });
                        }
                    }
                };

                Object.entries(eventHandlers).forEach(([event, handler]) => {
                    this.ws[event] = handler;
                });
            } catch (error) {
                errorHandler.handleError(error, { url: this.url, context: 'WebSocket creation' });
                reject(error);
            }
        });
    }

    disconnect() {
        this.shouldReconnect = false;
        this.ws?.close(1000, 'Client requested disconnect');
    }

    reconnect() {
        this.disconnect();
        this.shouldReconnect = true;
        return this.connect();
    }

    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            errorHandler.handleError(new Error('Max reconnection attempts reached'), {
                attempts: this.reconnectAttempts,
                maxAttempts: this.maxReconnectAttempts,
                context: 'WebSocket reconnection'
            });
            this._emit('error', { type: 'MAX_RECONNECT_ATTEMPTS' });
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;

        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

        Logger.info(`Scheduling reconnection`, {
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            delayMs: delay
        });

        setTimeout(() => {
            if (this.shouldReconnect) {
                Logger.info('Attempting to reconnect');
                this.connect().catch(error => {
                    errorHandler.handleError(error, { context: 'WebSocket reconnection' });
                    this._scheduleReconnect();
                });
            }
        }, delay);
    }

    sendMessage(type, payload) {
        if (!this.ws || this.ws.readyState !== this.ws.OPEN) {
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
            errorHandler.handleError(error, {
                type,
                payload,
                context: 'sendMessage'
            });
            this._emit('error', { type: 'SEND_ERROR', message: error.message });
            return false;
        }
    }

    sendCommand(command) {
        try {
            const message = MessageFormatter.createCommandMessage(command);
            if (!this.ws || this.ws.readyState !== this.ws.OPEN) {
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
            errorHandler.handleError(error, {
                command,
                context: 'sendCommand'
            });
            this._emit('error', { type: 'SEND_ERROR', message: error.message });
            return false;
        }
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

    isConnected() {
        return this.ws && this.ws.readyState === this.ws.OPEN;
    }

    isConnecting() {
        return this.ws && this.ws.readyState === this.ws.CONNECTING;
    }

    isReconnecting() {
        return this.isReconnecting;
    }
}

export default WebSocketService;