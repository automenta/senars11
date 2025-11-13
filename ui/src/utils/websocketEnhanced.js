// Enhanced WebSocket utilities for advanced functionality
import WebSocketService from './websocket.js';

/**
 * Enhanced WebSocket utilities for advanced functionality
 */

// Extends the base WebSocketService with additional functionality
export class EnhancedWebSocketService extends WebSocketService {
  constructor(url, options = {}) {
    super(url, options);

    // Additional functionality for requests and responses
    this.requestCallbacks = new Map();
    this.requestTimeouts = new Map();
    this.requestIdCounter = 0;
  }

  /**
     * Send a request and wait for a response
     */
  request(topic, payload, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();

      // Store the callbacks
      this.requestCallbacks.set(requestId, {resolve, reject});

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.requestCallbacks.delete(requestId);
        this.requestTimeouts.delete(requestId);
        reject(new Error(`Request timeout for topic: ${topic}`));
      }, timeout);

      // Store timeout ID to clear it later
      this.requestTimeouts.set(requestId, timeoutId);

      // Send the request
      this.sendMessage({
        type: 'REQUEST',
        topic,
        requestId,
        payload
      });
    });
  }

  /**
     * Generate a unique request ID
     */
  generateRequestId() {
    return `req_${++this.requestIdCounter}_${Date.now()}`;
  }

  /**
     * Override the message routing to handle responses
     */
  routeMessage(data) {
    // Handle response messages for requests
    if (data.type === 'RESPONSE' && data.requestId) {
      const callback = this.requestCallbacks.get(data.requestId);
      const timeoutId = this.requestTimeouts.get(data.requestId);

      if (callback) {
        // Clear the timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.requestTimeouts.delete(data.requestId);
        }

        // Execute the appropriate callback
        if (data.error) {
          callback.reject(new Error(data.error));
        } else {
          callback.resolve(data.payload);
        }

        // Remove the callback
        this.requestCallbacks.delete(data.requestId);
      }

      return;
    }

    // Call the parent routing for other message types
    super.routeMessage(data);
  }

  /**
     * Disconnect and cleanup request callbacks
     */
  disconnect() {
    // Clear all request timeouts
    for (const timeoutId of this.requestTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.requestTimeouts.clear();
    this.requestCallbacks.clear();

    // Call parent disconnect
    super.disconnect();
  }
}

// Message builder utilities
export const MessageBuilder = {
  /**
     * Build a request message
     */
  buildRequest: (topic, payload, requestId = null) => ({
    type: 'REQUEST',
    topic,
    requestId: requestId || `req_${Date.now()}`,
    payload
  }),

  /**
     * Build a response message
     */
  buildResponse: (requestId, payload, error = null) => ({
    type: 'RESPONSE',
    requestId,
    payload,
    error
  }),

  /**
     * Build a notification message
     */
  buildNotification: (topic, payload) => ({
    type: topic,
    payload
  }),

  /**
     * Build a system command message
     */
  buildSystemCommand: (command, params = {}) => ({
    type: 'systemCommand',
    payload: {command, ...params}
  }),

  /**
     * Build a panel command message
     */
  buildPanelCommand: (command, params = {}) => ({
    type: 'panelCommand',
    payload: {command, ...params}
  })
};

// Export the enhanced service and utilities
export default {
  EnhancedWebSocketService,
  MessageBuilder
};