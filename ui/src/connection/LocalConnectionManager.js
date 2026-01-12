import { ConnectionInterface } from './ConnectionInterface.js';
import { MeTTaInterpreter } from '@senars/metta';
import { Config } from '@senars/core';
import { T } from '@senars/tensor/src/backends/NativeBackend.js'; // Ensure Tensor backend is available

export class LocalConnectionManager extends ConnectionInterface {
    constructor() {
        super();
        this.connectionStatus = 'disconnected';
        this.messageHandlers = new Map();
        this.interpreter = null;
        this.eventQueue = [];
        this.isProcessingQueue = false;

        // Mock virtual files for stdlib to prevent loading errors in browser
        this.virtualFiles = {
            'core': '(= (id $x) $x)',
            'list': '',
            'match': '',
            'types': '',
            'truth': '',
            'nal': '',
            'attention': '',
            'control': '',
            'search': '',
            'learn': ''
        };
    }

    async connect() {
        try {
            console.log('Initializing Local MeTTa Environment...');

            // Initialize Core Config
            Config.parse([]);

            // Initialize MeTTa Interpreter
            this.interpreter = new MeTTaInterpreter({
                virtualFiles: this.virtualFiles
            });
            await this.interpreter.initialize();

            this.connectionStatus = 'connected';
            this.notifyStatusChange('connected');

            // Simulate initial server events
            this._dispatchLocalEvent('system.ready', { version: '1.0.0-local' });

        } catch (error) {
            console.error('Local initialization failed:', error);
            this.connectionStatus = 'error';
            this.notifyStatusChange('error');
        }
    }

    sendMessage(type, payload) {
        if (this.connectionStatus !== 'connected') {
            console.warn('Cannot send message: not connected');
            return false;
        }

        // Process message asynchronously to simulate network delay/decoupling
        setTimeout(() => this._handleClientMessage(type, payload), 0);
        return true;
    }

    async _handleClientMessage(type, payload) {
        try {
            switch (type) {
                case 'narseseInput':
                case 'agent/input':
                    await this._processInput(payload.input);
                    break;
                case 'command.execute':
                    await this._executeCommand(payload.command, payload.args);
                    break;
                case 'control/step':
                    // TODO: Implement stepping
                    break;
                case 'control/run':
                    // TODO: Implement running
                    break;
                default:
                    console.warn(`Local handler not implemented for: ${type}`);
            }
        } catch (error) {
            this._dispatchLocalEvent('error', { message: error.message });
        }
    }

    async _processInput(input) {
        if (!this.interpreter) return;

        // Echo input back as "input" type message
        this._dispatchLocalEvent('activity.input', { content: input, source: 'user' });

        try {
            const result = await this.interpreter.run(input);
            // Dispatch result
            const resultStr = result ? result.toString() : 'Done';
            this._dispatchLocalEvent('agent/result', { result: resultStr });

            // Attempt to visualize if it's a concept/term
            // This is a simplification; mimicking server's rich parsing would require more logic
            // For now, we just log the result.

        } catch (e) {
            this._dispatchLocalEvent('lm:error', { error: e.message });
        }
    }

    async _executeCommand(command, args) {
        // Implement basic commands
        if (command === 'goals') {
            this._dispatchLocalEvent('agent/result', { result: 'Local goals: (not implemented)' });
        } else if (command === 'beliefs') {
            this._dispatchLocalEvent('agent/result', { result: 'Local beliefs: (not implemented)' });
        }
    }

    _dispatchLocalEvent(type, payload) {
        const message = {
            type: type,
            payload: payload,
            timestamp: Date.now()
        };

        // Use the same dispatch logic as WebSocketManager
        const specificHandlers = this.messageHandlers.get(type) ?? [];
        const generalHandlers = this.messageHandlers.get('*') ?? [];

        [...specificHandlers, ...generalHandlers].forEach(handler => {
            try {
                handler(message);
            } catch (e) {
                console.error('Error in local message handler:', e);
            }
        });
    }

    subscribe(type, handler) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type).push(handler);
    }

    unsubscribe(type, handler) {
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    getConnectionStatus() {
        return this.connectionStatus;
    }

    notifyStatusChange(status) {
        const handlers = this.messageHandlers.get('connection.status') || [];
        handlers.forEach(handler => handler(status));
    }

    close() {
        this.interpreter = null;
        this.connectionStatus = 'disconnected';
    }
}
