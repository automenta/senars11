import Logger from './utils/logger.js';

/**
 * REPLController - Coordinates between the REPLView, StateStore, and WebSocketService
 */
export default class REPLController {
    constructor(viewAPI, store, service) {
        this.viewAPI = viewAPI;
        this.store = store;
        this.service = service;
        this.unsubscribe = null;
        this.init();
    }

    init() {
        try {
            this.unsubscribe = this.store.subscribe((state, action) => {
                this.handleStoreChange(state, action);
            });

            this.viewAPI.setCommandHandler(this.handleCommand.bind(this));
        } catch (error) {
            Logger.error('Error initializing REPLController', { error: error.message });
        }
    }

    handleStoreChange(state, action) {
        try {
            const actionHandlers = {
                'ADD_LOG_ENTRY': () => this.viewAPI.addOutput(`[LOG] ${action.payload.content}`),
                'SET_CONNECTION_STATUS': () => this.viewAPI.addOutput(`[STATUS] Connection: ${state.connectionStatus}`)
            };

            const handler = actionHandlers[action.type];
            handler?.();
        } catch (error) {
            Logger.error('Error in REPLController handleStoreChange', { error: error.message, action });
        }
    }

    handleCommand(command) {
        try {
            this.viewAPI.addToHistory(command);
            const success = this.service.sendCommand(command);

            if (success) {
                this.store.dispatch({
                    type: 'ADD_LOG_ENTRY',
                    payload: { content: `SENT: ${command}`, type: 'out' }
                });
            } else {
                this.viewAPI.addOutput(`[ERROR] Failed to send command: ${command}`);
            }
        } catch (error) {
            Logger.error('Error handling command', { error: error.message, command });
        }
    }

    handleIncomingMessage(message) {
        try {
            // Only display certain message types in the REPL log
            if (message.type === 'connection' || message.type === 'error') {
                const content = message.data?.message || message.payload?.message || JSON.stringify(message);
                this.store.dispatch({
                    type: 'ADD_LOG_ENTRY',
                    payload: { content: `INFO: ${content}`, type: 'in' }
                });

                this.viewAPI.addOutput(`[INFO] ${content}`);
            } else if (message.type === 'control/ack') {
                const content = `Command ack: ${message.payload?.command} - ${message.payload?.status}`;
                this.store.dispatch({
                    type: 'ADD_LOG_ENTRY',
                    payload: { content, type: 'in' }
                });

                this.viewAPI.addOutput(`[CMD] ${content}`);
            }
            // For other message types, we only process them internally (for graph updates)
            // but don't display the raw JSON in the REPL view
        } catch (error) {
            Logger.error('Error handling incoming message', { error: error.message, message });
        }
    }

    destroy() {
        try {
            this.unsubscribe?.();
        } catch (error) {
            Logger.error('Error destroying REPLController', { error: error.message });
        }
    }
}