import { Config } from '../config/Config.js';
import { Logger } from '../logging/Logger.js';
import { WebSocketConnectionError } from '../errors/CustomErrors.js';
import { ConnectionInterface } from './ConnectionInterface.js';

export class WebSocketManager extends ConnectionInterface {
    constructor() {
        super();
        this.ws = null;
        this.connectionStatus = 'disconnected';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = Config.getConstants().MAX_RECONNECT_ATTEMPTS;
        this.reconnectDelay = Config.getConstants().RECONNECT_DELAY;
        this.messageHandlers = new Map();
        this.logger = new Logger();
        this.eventQueue = [];
        this.isProcessingQueue = false;
        this.processSliceMs = 12;
    }


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

                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.connect(), this.reconnectDelay);
                } else {
                    this.logger.log(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`, 'error', '🚨');
                }
            };

            this.ws.onerror = () => {
                this.connectionStatus = 'error';
                this.logger.log('WebSocket connection error', 'error', '🚨');
                this.notifyStatusChange('error');
            };

            this.ws.onmessage = (event) => {
                try {
                    this.handleMessage(JSON.parse(event.data));
                } catch (e) {
                    this.logger.log(`Invalid message format: ${event.data}`, 'error', '🚨');
                }
            };
        } catch (error) {
            this.connectionStatus = 'error';
            this.logger.log('Failed to create WebSocket', 'error', '🚨');
            if (!(error instanceof WebSocketConnectionError)) {
                throw new WebSocketConnectionError(error.message, 'WEBSOCKET_CREATION_FAILED');
            }
        }
    }


    sendMessage(type, payload) {
        if (!this.isConnected()) return false;
        this.ws.send(JSON.stringify({ type, payload }));
        return true;
    }


    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }


    subscribe(type, handler) {
        !this.messageHandlers.has(type) && this.messageHandlers.set(type, []);
        this.messageHandlers.get(type).push(handler);
    }


    unsubscribe(type, handler) {
        const handlers = this.messageHandlers.get(type);
        const index = handlers?.indexOf(handler);
        index > -1 && handlers.splice(index, 1);
    }


    getConnectionStatus() {
        return this.connectionStatus;
    }

    handleMessage(message) {
        if (!message) return;

        if (message.type === 'eventBatch') {
            const events = message.data ?? [];
            this.logger.log(`Received batch of ${events.length} events`, 'debug', '📦');
            const normalized = events.map(e => ({ type: e.type, payload: e.data, timestamp: e.timestamp }));
            this.eventQueue.push(...normalized);
        } else {
            this.eventQueue.push(message);
        }

        this.scheduleQueueProcessing();
    }

    scheduleQueueProcessing() {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;
        setTimeout(() => this.processQueue(), 0);
    }

    processQueue() {
        const startTime = performance.now();

        while (this.eventQueue.length > 0) {
            if (performance.now() - startTime > this.processSliceMs) {
                setTimeout(() => this.processQueue(), 0);
                return;
            }
            this.dispatchMessage(this.eventQueue.shift());
        }

        this.isProcessingQueue = false;
    }

    dispatchMessage(message) {
        if (message.type === 'cycle.start' || message.type === 'cycle.complete') return;

        const specificHandlers = this.messageHandlers.get(message.type) ?? [];
        const generalHandlers = this.messageHandlers.get('*') ?? [];

        [...specificHandlers, ...generalHandlers].forEach((handler, index) => {
            const handlerType = index < specificHandlers.length ? message.type : '*';
            this.tryHandleMessage(handler, message, handlerType);
        });
    }


    tryExecuteHandler(handler, arg, handlerType, message = null) {
        if (!handler || typeof handler !== 'function') return;

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


    tryHandleMessage(handler, message, handlerType) {
        const context = handlerType === '*' ? 'general' : `message handler for ${message.type}`;
        this.tryExecuteHandler(handler, message, context, message);
    }


    notifyStatusChange(status) {
        (this.messageHandlers.get('connection.status') ?? []).forEach(handler =>
            this.tryExecuteHandler(handler, status, 'status handler')
        );
    }


    close() {
        this.ws?.close();
    }
}
