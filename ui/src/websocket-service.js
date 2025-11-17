import { WEBSOCKET_URL, RECONNECT_DELAY } from './config.js';

class WebSocketService {
    constructor(url = null) {
        // Use provided URL, or get dynamic URL
        this.url = url || this._getWebSocketUrl();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = RECONNECT_DELAY;
        this.eventListeners = new Map();
        this.isReconnecting = false;
        this.shouldReconnect = true;
    }

    _getWebSocketUrl() {
        // Try to use the page's current hostname instead of hardcoded localhost
        if (typeof window !== 'undefined' && window.location && window.location.hostname) {
            return `ws://${window.location.hostname}:8080/ws`;
        }
        // Fallback to config value if in non-browser environment
        return WEBSOCKET_URL;
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
                        console.log('WebSocket connected');
                        this.reconnectAttempts = 0;
                        this.isReconnecting = false;
                        this._emit('open');
                        resolve();
                    },
                    'onclose': (event) => {
                        console.log('WebSocket closed:', event.code, event.reason);
                        this._emit('close', event);
                        if (this.shouldReconnect && event.code !== 1000) {
                            this._scheduleReconnect();
                        }
                    },
                    'onerror': (error) => {
                        console.error('WebSocket error:', error);
                        this._emit('error', error);
                        reject(error);
                    },
                    'onmessage': (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            this._emit('message', data);
                        } catch (parseError) {
                            console.error('Error parsing WebSocket message:', parseError, 'Raw message:', event.data);
                            this._emit('error', { type: 'PARSE_ERROR', message: parseError.message, raw: event.data });
                        }
                    }
                };

                Object.entries(eventHandlers).forEach(([event, handler]) => {
                    this.ws[event] = handler;
                });
            } catch (error) {
                console.error('Error creating WebSocket connection:', error);
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
            console.error('Max reconnection attempts reached');
            this._emit('error', { type: 'MAX_RECONNECT_ATTEMPTS' });
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;

        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

        console.log(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

        setTimeout(() => {
            if (this.shouldReconnect) {
                console.log('Attempting to reconnect...');
                this.connect().catch(error => {
                    console.error('Reconnection failed:', error);
                    this._scheduleReconnect();
                });
            }
        }, delay);
    }

    sendMessage(type, payload) {
        if (!this.ws || this.ws.readyState !== this.ws.OPEN) {
            console.error('WebSocket not connected, cannot send message');
            return false;
        }

        try {
            const message = { type, payload, timestamp: Date.now() };
            this.ws.send(JSON.stringify(message));
            this._emit('outgoingMessage', message);
            return true;
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
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
                console.error(`Error in ${eventType} listener:`, error);
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