import { ConnectionInterface } from './ConnectionInterface.js';
import { NAR } from '../../../core/src/nar/NAR.js'; // Adjust path if needed or use aliases
import { MeTTaInterpreter } from '../../../metta/src/MeTTaInterpreter.js';
import { Config } from '../../../core/src/config/Config.js';
import { Logger } from '../logging/Logger.js';

export class LocalConnectionManager extends ConnectionInterface {
    constructor() {
        super();
        this.messageHandlers = new Map();
        this.logger = new Logger();
        this.nar = null;
        this.metta = null;
        this.connectionStatus = 'disconnected';
    }

    async connect() {
        try {
            this.connectionStatus = 'connecting';
            this.notifyStatusChange('connecting');

            // Initialize Core components
            const config = Config.parse([]); // Use default config or inject
            config.system = { ...config.system, enableLogging: false }; // Reduce noise?

            // Initialize NAR
            this.nar = new NAR(config);
            await this.nar.initialize();

            // Initialize MeTTa
            this.metta = new MeTTaInterpreter(this.nar, config);
            await this.metta.initialize();

            // Hook into NAR output to dispatch events
            this.nar.eventBus.on('*', (type, payload) => {
                this.dispatchMessage({ type, payload, timestamp: Date.now() });
            });

            // Hook into MeTTa output if needed
            // this.metta.eventBus.on...

            this.connectionStatus = 'connected';
            this.logger.log('Connected to Local SeNARS', 'success', '💻');
            this.notifyStatusChange('connected');

            // Simulate "Welcome" message found in server version
            setTimeout(() => {
                this.dispatchMessage({ type: 'agent/result', payload: { result: "Welcome to SeNARS Local Mode" } });
            }, 100);

            return true;
        } catch (error) {
            console.error("Local connection failed", error);
            this.connectionStatus = 'error';
            this.notifyStatusChange('error');
            return false;
        }
    }

    sendMessage(type, payload) {
        if (this.connectionStatus !== 'connected') {
            console.warn("LocalConnectionManager: Not connected. Message dropped:", type);
            return false;
        }

        // Handle standard messages
        this.processLocalMessage(type, payload);
        return true;
    }

    async processLocalMessage(type, payload) {
        try {
            switch (type) {
                case 'agent/input':
                    await this.handleInput(payload);
                    break;
                case 'control/reset':
                    await this.handleReset();
                    break;
                case 'control/step':
                    // this.nar.step() or similar
                    break;
                // Add other command handlers as needed
                default:
                    console.log("LocalConnectionManager: Unhandled message type", type);
            }
        } catch (e) {
            this.logger.log(`Local execution error: ${e.message}`, 'error', '🚨');
        }
    }

    async handleInput(payload) {
        const text = payload.text || payload;
        // Basic routing: if starts with '!', likely MeTTa, else Narsese? 
        // Or send to NAR which has input processing.
        // Assuming NAR.addInput(text) handles it.

        if (this.nar) {
            const result = await this.nar.addInput(text);
            // Result might be returned immediately
            // Typically NAR emits events for results
        }

        // Also could try MeTTa run directly if it's metta code
        if (this.metta && (text.startsWith('!') || text.startsWith('(') || text.startsWith('='))) {
            try {
                const results = await this.metta.run(text);
                if (results && results.length > 0) {
                    this.dispatchMessage({
                        type: 'agent/result',
                        payload: { result: results.map(r => r.toString()).join('\n') }
                    });
                }
            } catch (e) {
                this.dispatchMessage({ type: 'error', payload: { message: e.message } });
            }
        }
    }

    async handleReset() {
        if (this.nar) await this.nar.reset();
        if (this.metta) {
            this.metta = new MeTTaInterpreter(this.nar, this.nar.config); // Re-create?
            await this.metta.initialize();
        }
        this.dispatchMessage({ type: 'system/reset', payload: {} });
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

    disconnect() {
        this.connectionStatus = 'disconnected';
        this.notifyStatusChange('disconnected');
    }

    // Helper to dispatch to internal subscribers (UI)
    dispatchMessage(message) {
        const handlers = this.messageHandlers.get(message.type) || [];
        const generalHandlers = this.messageHandlers.get('*') || [];

        [...handlers, ...generalHandlers].forEach(h => {
            try { h(message); } catch (e) { console.error("Handler error", e); }
        });
    }

    notifyStatusChange(status) {
        const handlers = this.messageHandlers.get('connection.status') || [];
        handlers.forEach(h => h(status));
    }
}
