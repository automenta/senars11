/**
 * Centralized WebSocket client utilities for SeNARS application
 * Shared between UI and automation scripts
 */

import { config } from '../src/config.js';

/**
 * Create a WebSocket client with common configuration and error handling
 */
class WebSocketClient {
  /**
   * Creates a new WebSocket client
   * @param {string} url - The WebSocket URL to connect to
   * @param {Object} options - Configuration options
   */
  constructor(url, options = {}) {
    this.url = url || config.webSocket.url || `ws://${config.webSocket.host}:${config.webSocket.port}${config.webSocket.path}`;
    this.options = {
      reconnectInterval: config.performance.reconnectInterval,
      maxReconnectAttempts: config.performance.maxReconnectAttempts,
      heartbeatInterval: config.performance.heartbeatInterval,
      heartbeatTimeout: config.performance.heartbeatTimeout,
      ...options
    };
    
    this.ws = null;
    this.reconnectAttempts = 0;
    this.heartbeatIntervalId = null;
    this.heartbeatTimeoutId = null;
    this.messageQueue = [];
    this.eventListeners = {
      open: [],
      close: [],
      error: [],
      message: []
    };
    
    this.readyState = WebSocket.CLOSED;
  }

  /**
   * Connect to the WebSocket server
   */
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.warn('WebSocket is already connecting or connected');
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = (event) => {
        this.readyState = WebSocket.OPEN;
        this.reconnectAttempts = 0;
        this.setupHeartbeat();
        
        // Execute all registered open listeners
        this.eventListeners.open.forEach(callback => callback(event));
      };

      this.ws.onclose = (event) => {
        this.readyState = WebSocket.CLOSED;
        this.clearHeartbeat();
        
        // Execute all registered close listeners
        this.eventListeners.close.forEach(callback => callback(event));
        
        // Attempt to reconnect
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        // Execute all registered error listeners
        this.eventListeners.error.forEach(callback => callback(error));
      };

      this.ws.onmessage = (event) => {
        // Check if this is a heartbeat response
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            this.handleHeartbeatResponse();
            return;
          }
        } catch (e) {
          // Not a JSON message or not a pong message
        }
        
        // Execute all registered message listeners
        this.eventListeners.message.forEach(callback => callback(event));
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.eventListeners.error.forEach(callback => callback(error));
    }
  }

  /**
   * Register an event listener for WebSocket events
   */
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }

  /**
   * Remove an event listener for WebSocket events
   */
  off(event, callback) {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(callback);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }

  /**
   * Send a message through the WebSocket
   */
  send(message) {
    if (this.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.messageQueue.push(message); // Queue message for later
      }
    } else {
      console.warn('WebSocket not connected, queuing message');
      this.messageQueue.push(message);
    }
  }

  /**
   * Close the WebSocket connection
   */
  close() {
    this.clearHeartbeat();
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * Setup heartbeat mechanism for connection monitoring
   */
  setupHeartbeat() {
    this.clearHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatIntervalId = setInterval(() => {
      if (this.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() });
        
        // Set timeout for heartbeat response
        this.heartbeatTimeoutId = setTimeout(() => {
          console.warn('Heartbeat timeout - connection may be lost');
          this.close();
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Clear heartbeat mechanism
   */
  clearHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
  }

  /**
   * Handle heartbeat response
   */
  handleHeartbeatResponse() {
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  attemptReconnect = () => {
    if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
      console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.options.maxReconnectAttempts})...`);
      this.reconnectAttempts++;
      
      setTimeout(() => {
        this.connect();
      }, this.options.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  };

  /**
   * Process queued messages when connection is established
   */
  processQueue() {
    while (this.messageQueue.length > 0 && this.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }
}

/**
 * Helper function to create a WebSocket client with default configuration
 */
function createWebSocketClient(url, options = {}) {
  return new WebSocketClient(url, options);
}

/**
 * Helper function to create a test WebSocket client with simulation capabilities
 */
function createTestWebSocketClient(url, options = {}) {
  const client = new WebSocketClient(url, {
    ...options,
    isTestEnvironment: true
  });

  if (options.isTestMode || process.env.NODE_ENV === 'test') {
    client.on('open', () => {
      // Send initial demo list that tests expect
      client.send({
        type: 'demoList',
        payload: [
          { id: 'basic-reasoning', name: 'Basic Reasoning Demo', description: 'A simple reasoning demonstration' },
          { id: 'syllogistic', name: 'Syllogistic Reasoning', description: 'Classic syllogistic inference patterns' },
          { id: 'complex-inference', name: 'Complex Inference', description: 'Advanced inference chaining' }
        ]
      });
    });
  }

  return client;
}

export {
  WebSocketClient,
  createWebSocketClient,
  createTestWebSocketClient
};

export default createWebSocketClient;