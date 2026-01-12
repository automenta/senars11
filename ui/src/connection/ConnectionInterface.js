/**
 * Common interface for connection managers (WebSocket or Local)
 */
export class ConnectionInterface {
    /**
     * Connect to the backend (server or local instance)
     * @returns {Promise<void>}
     */
    async connect() { }

    /**
     * Send a message to the backend
     * @param {string} type - Message type
     * @param {object} payload - Message payload
     * @returns {boolean} - True if sent
     */
    sendMessage(type, payload) { }

    /**
     * Subscribe to a message type
     * @param {string} type - Message type or '*' for all
     * @param {function} handler - Callback function
     */
    subscribe(type, handler) { }

    /**
     * Unsubscribe from a message type
     * @param {string} type - Message type
     * @param {function} handler - Callback function
     */
    unsubscribe(type, handler) { }

    /**
     * Get current connection status
     * @returns {string} - 'connected', 'disconnected', 'error'
     */
    getConnectionStatus() { }

    /**
     * Close the connection
     */
    close() { }
}
