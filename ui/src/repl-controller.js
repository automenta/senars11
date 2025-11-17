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
        this.unsubscribe = this.store.subscribe((state, action) => {
            this.handleStoreChange(state, action);
        });

        this.viewAPI.setCommandHandler(this.handleCommand.bind(this));
    }

    handleStoreChange(state, action) {
        const actionHandlers = {
            'ADD_LOG_ENTRY': () => this.viewAPI.addOutput(`[LOG] ${action.payload.content}`),
            'SET_CONNECTION_STATUS': () => this.viewAPI.addOutput(`[STATUS] Connection: ${state.connectionStatus}`)
        };

        const handler = actionHandlers[action.type];
        handler?.();
    }

    handleCommand(command) {
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
    }

    handleIncomingMessage(message) {
        this.store.dispatch({
            type: 'ADD_LOG_ENTRY',
            payload: { content: `RECV: ${JSON.stringify(message)}`, type: 'in' }
        });

        this.viewAPI.addOutput(`[RECV] ${JSON.stringify(message)}`);
    }

    destroy() {
        this.unsubscribe?.();
    }
}