/**
 * ConnectionInterface.js
 * 
 * Defines the contract for communication adapters (WebSocket or Local).
 * Allows the UI to operate transparently regardless of the backend.
 */

export class ConnectionInterface {
    /**
     * Establish connection to the backend
     * @returns {Promise<boolean>}
     */
    async connect() {
        throw new Error('Method not implemented');
    }

    /**
     * Send a message to the backend
     * @param {string} type - Message type (e.g. 'agent/input')
     * @param {Object} payload - Message data
     */
    sendMessage(type, payload) {
        throw new Error('Method not implemented');
    }

    /**
     * Subscribe to backend events
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    subscribe(event, callback) {
        throw new Error('Method not implemented');
    }

    /**
     * Unsubscribe from backend events
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    unsubscribe(event, callback) {
        throw new Error('Method not implemented');
    }

    /**
     * Disconnect from the backend
     */
    disconnect() {
        throw new Error('Method not implemented');
    }
}
