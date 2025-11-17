import AppConfig from './config/app-config.js';
import Logger from './utils/logger.js';

class WebSocketService {
    constructor(url = null) {
        // Use provided URL, or get dynamic URL
        this.url = url || this._getWebSocketUrl();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = AppConfig.websocket.maxReconnectAttempts;
        this.reconnectDelay = AppConfig.websocket.reconnectDelay;
        this.eventListeners = new Map();
        this.isReconnecting = false;
        this.shouldReconnect = true;
    }

    _getWebSocketUrl() {
        // Try to use the page's current hostname instead of hardcoded localhost
        if (typeof window !== 'undefined' && window.location && window.location.hostname) {
            return `ws://${window.location.hostname}:${AppConfig.websocket.defaultPort}${AppConfig.websocket.defaultPath}`;
        }
        // Fallback to config value if in non-browser environment
        return `ws://${AppConfig.websocket.defaultHost}:${AppConfig.websocket.defaultPort}${AppConfig.websocket.defaultPath}`;
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
                        if (this.shouldReconnect && event.code !== 1000) {
                            this._scheduleReconnect();
                        }
                    },
                    'onerror': (error) => {
                        Logger.error('WebSocket error', { error, url: this.url });
                        this._emit('error', error);
                        reject(error);
                    },
                    'onmessage': (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            this._emit('message', data);
                        } catch (parseError) {
                            Logger.error('Error parsing WebSocket message', {
                                error: parseError.message,
                                raw: event.data
                            });
                            this._emit('error', { type: 'PARSE_ERROR', message: parseError.message, raw: event.data });
                        }
                    }
                };

                Object.entries(eventHandlers).forEach(([event, handler]) => {
                    this.ws[event] = handler;
                });
            } catch (error) {
                Logger.error('Error creating WebSocket connection', { error, url: this.url });
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
            Logger.error('Max reconnection attempts reached', {
                attempts: this.reconnectAttempts,
                maxAttempts: this.maxReconnectAttempts
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
                    Logger.error('Reconnection failed', { error });
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
            const message = { type, payload, timestamp: Date.now() };
            this.ws.send(JSON.stringify(message));
            this._emit('outgoingMessage', message);
            return true;
        } catch (error) {
            Logger.error('Error sending WebSocket message', { error: error.message, type });
            this._emit('error', { type: 'SEND_ERROR', message: error.message });
            return false;
        }
    }

    sendCommand(command) {
        return this.sendMessage('narseseInput', { input: command });
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
                Logger.error(`Error in ${eventType} listener`, { error: error.message });
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