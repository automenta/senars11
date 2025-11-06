/**
 * Reusable WebSocket class for SeNARS REPL
 * Provides a simplified interface for WebSocket communication with reconnection logic
 */
export default class WebSocketClient {
  /**
   * Create a new WebSocket client
   * @param {string} url - WebSocket server URL
   * @param {string} sessionId - Session identifier
   */
  constructor(url, sessionId) {
    this.url = url;
    this.sessionId = sessionId;
    this.websocket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // Event handlers
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    
    this.connect();
  }
  
  /**
   * Establish WebSocket connection with reconnection logic
   */
  connect() {
    // Create WebSocket with session-specific URL
    this.websocket = new WebSocket(`${this.url}?session=${this.sessionId}`);
    
    // Set up event handlers
    this.websocket.onopen = (event) => {
      this.reconnectAttempts = 0;
      this.onopen?.(event);
    };
    
    this.websocket.onclose = (event) => {
      this.onclose?.(event);
      // Attempt to reconnect if not closed intentionally
      const shouldReconnect = this.shouldReconnect(event);
      if (shouldReconnect) {
        this.reconnect();
      }
    };
    
    this.websocket.onerror = (error) => {
      this.onerror?.(error);
    };
    
    this.websocket.onmessage = (event) => {
      this.onmessage?.(event);
    };
  }
  
  /**
   * Determine if reconnection should occur
   * @param {CloseEvent} event - Close event
   * @returns {boolean} Whether to reconnect
   */
  shouldReconnect(event) {
    // Don't reconnect if closed cleanly or if max attempts reached
    return !event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts;
  }
  
  /**
   * Reconnect with exponential backoff
   */
  reconnect() {
    this.reconnectAttempts++;
    const delay = this.calculateReconnectDelay();
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  /**
   * Calculates the reconnect delay with exponential backoff
   * @returns {number} Delay in milliseconds
   */
  calculateReconnectDelay() {
    return this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
  }
  
  /**
   * Send a message through the WebSocket
   * @param {Object} data - Message data to send
   */
  send(data) {
    if (!this.isConnected()) {
      console.warn('WebSocket is not initialized. Message not sent:', data);
      return;
    }
    
    // Add sessionId to the message if not already present
    const message = this.ensureMessageHasSessionId(data);
    this.websocket.send(JSON.stringify(message));
  }
  
  /**
   * Ensures the message has a sessionId
   * @param {Object} data - Original message data
   * @returns {Object} Message data with sessionId
   */
  ensureMessageHasSessionId(data) {
    return data.sessionId ? data : { sessionId: this.sessionId, ...data };
  }
  
  /**
   * Check if the WebSocket is connected
   * @returns {boolean} True if connected, false otherwise
   */
  isConnected() {
    return this.websocket?.readyState === WebSocket.OPEN;
  }
  
  /**
   * Close the WebSocket connection with optional code and reason
   * @param {number} code - Close code
   * @param {string} reason - Close reason
   */
  close(code, reason) {
    this.websocket?.close(code, reason);
  }
}