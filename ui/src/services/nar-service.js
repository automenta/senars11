/**
 * @file WebSocket service for communication with the SeNARS backend.
 * This service manages the WebSocket connection and provides methods for sending
 * and receiving data related to the NAR engine. It normalizes incoming event
 * messages and emits typed events for the rest of the application.
 */

import { EventEmitter } from 'events';

class NARService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
  }

  /**
   * Initializes the WebSocket connection.
   * @param {string} url - The WebSocket server URL.
   */
  initialize(url) {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connection established.');
      this.emit('open');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed.');
      this.emit('close');
    };
  }

  /**
   * Handles incoming messages from the WebSocket server.
   * It determines the message type and emits corresponding events.
   * @param {object} message - The parsed message from the server.
   */
  handleMessage(message) {
    if (message.type === 'memorySnapshot') {
      this.emit('snapshot', message.payload);
      return;
    }

    // Normalize single events into an array so the store can handle them consistently.
    const eventBatch = Array.isArray(message) ? message : [message];
    this.emit('batch', eventBatch);
  }

  /**
   * Sends a request to the server for a memory snapshot.
   * @param {object} options - The query options for the snapshot.
   * @param {number} options.limit - The maximum number of items to return.
   * @param {string} options.sortBy - The sorting criteria.
   */
  requestMemorySnapshot(options) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'control/requestMemorySnapshot',
        payload: options,
      }));
    } else {
      console.error('WebSocket is not connected.');
    }
  }

  /**
   * Sends Narsese input to the server.
   * @param {string} narsese - The Narsese string to send.
   */
  sendNarsese(narsese) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'narseseInput',
        payload: narsese,
      }));
    } else {
      console.error('WebSocket is not connected.');
    }
  }

  /**
   * Closes the WebSocket connection.
   */
  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Export a singleton instance of the service.
const narService = new NARService();
export default narService;
