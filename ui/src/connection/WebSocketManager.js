import { Config } from '../config/Config.js';
import { Logger } from '../logging/Logger.js';

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
      };

      this.ws.onclose = () => {
        this.connectionStatus = 'disconnected';
        this.logger.log('Disconnected from server', 'warning', '🔌');
        this._notifyStatusChange('disconnected');

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
      throw error;
    }
  }

  /**
   * Send a message through the WebSocket
   */
  sendMessage(type, payload) {
    if (this.isConnected()) {
      const message = { type, payload };
      this.ws.send(JSON.stringify(message));
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

        // Use requestAnimationFrame to avoid blocking the UI thread with too many messages
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
          window.requestAnimationFrame(() => {
            batch.forEach(event => {
              // Normalize event structure to match what handleMessage expects
              this._handleMessage({
                type: event.type,
                payload: event.data,
                timestamp: event.timestamp
              });
            });
          });
        } else {
          // Fallback for environments without requestAnimationFrame
          batch.forEach(event => {
            // Normalize event structure to match what handleMessage expects
            this._handleMessage({
              type: event.type,
              payload: event.data,
              timestamp: event.timestamp
            });
          });
        }
      }
      return;
    }

    // Filter out noisy events
    if (message.type === 'cycle.start' || message.type === 'cycle.complete') {
      return; // Too noisy for main log
    }

    // Notify all handlers for this message type
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        this.logger.log(`Error in message handler for ${message.type}: ${error.message}`, 'error', '🚨');
      }
    });

    // Also notify general message handlers
    const generalHandlers = this.messageHandlers.get('*') || [];
    generalHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        this.logger.log(`Error in general message handler: ${error.message}`, 'error', '🚨');
      }
    });
  }

  /**
   * Private method to notify status changes
   */
  _notifyStatusChange(status) {
    const statusHandlers = this.messageHandlers.get('connection.status') || [];
    statusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        this.logger.log(`Error in status handler: ${error.message}`, 'error', '🚨');
      }
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