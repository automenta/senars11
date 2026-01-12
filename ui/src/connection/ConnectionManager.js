import { ConnectionInterface } from './ConnectionInterface.js';

/**
 * ConnectionManager.js
 * 
 * Facade for the active connection adapter.
 * Ensures the UI interacts with a consistent interface regardless of the underlying transport.
 */
export class ConnectionManager extends ConnectionInterface {
    /**
     * @param {ConnectionInterface} adapter - The specific adapter (Local or WebSocket)
     */
    constructor(adapter) {
        super();
        if (!adapter) {
            throw new Error('ConnectionManager requires an adapter');
        }
        this.adapter = adapter;
    }

    async connect() {
        return this.adapter.connect();
    }

    sendMessage(type, payload) {
        return this.adapter.sendMessage(type, payload);
    }

    subscribe(event, handler) {
        return this.adapter.subscribe(event, handler);
    }

    unsubscribe(event, handler) {
        return this.adapter.unsubscribe(event, handler);
    }

    disconnect() {
        return this.adapter.disconnect();
    }
}
