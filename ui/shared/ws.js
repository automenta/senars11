/**
 * Reusable WebSocket class for SeNARS REPL
 * Provides a simplified interface for WebSocket communication with reconnection logic
 */
class WebSocketClient {
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
      if (this.onopen) this.onopen(event);
    };
    
    this.websocket.onclose = (event) => {
      if (this.onclose) this.onclose(event);
      // Attempt to reconnect if not closed intentionally
      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnect();
      }
    };
    
    this.websocket.onerror = (error) => {
      if (this.onerror) this.onerror(error);
    };
    
    this.websocket.onmessage = (event) => {
      if (this.onmessage) this.onmessage(event);
    };
  }
  
  /**
   * Reconnect with exponential backoff
   */
  reconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  /**
   * Send a message through the WebSocket
   * @param {Object} data - Message data to send
   */
  send(data) {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      // Add sessionId to the message if not already present
      const message = data.sessionId ? data : { sessionId: this.sessionId, ...data };
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not open. Message not sent:', data);
    }
  }
  
  /**
   * Close the WebSocket connection
   */
  close() {
    if (this.websocket) {
      this.websocket.close();
    }
  }
}

export default WebSocketClient;