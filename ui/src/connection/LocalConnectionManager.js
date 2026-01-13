import { ConnectionInterface } from './ConnectionInterface.js';
import { NAR } from '../../../core/src/nar/NAR.js'; // Adjust path if needed or use aliases
import { MeTTaInterpreter } from '../../../metta/src/MeTTaInterpreter.js';
import { Config } from '../../../core/src/config/Config.js';
import { Logger } from '../logging/Logger.js';

import { BROWSER_STDLIB } from '../BrowserStdlib.js';

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
            this.updateStatus('connecting');
            const config = Config.parse([]);
            config.system = { ...config.system, enableLogging: false };

            if (typeof window !== 'undefined') {
                config.components = {};
            } else {
                config.components ??= {};
                if (config.components.Metacognition) config.components.Metacognition.enabled = false;
                else config.components.Metacognition = { enabled: false };
                config.components.LMIntegration && (config.components.LMIntegration.enabled = false);
            }

            this.nar = new NAR(config);
            await this.nar.initialize();

            this.metta = new MeTTaInterpreter(this.nar, {
                ...config,
                virtualFiles: BROWSER_STDLIB,
                fs: null, path: null, url: null
            });
            await this.metta.initialize();

            this.nar.eventBus.on('*', (type, payload) => this.dispatchMessage({ type, payload, timestamp: Date.now() }));

            this.updateStatus('connected');
            this.logger.log('Connected to Local SeNARS', 'success', '💻');

            setTimeout(() => this.dispatchMessage({ type: 'agent/result', payload: { result: "Welcome to SeNARS Local Mode" } }), 100);
            return true;
        } catch (error) {
            console.error("Local connection failed", error);
            this.updateStatus('error');
            return false;
        }
    }

    isConnected() {
        return this.connectionStatus === 'connected';
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
                case 'narseseInput':
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
        const text = payload.text || payload.input || payload;
        this.nar && await this.nar.input(text);

        if (this.metta && /^(!|\(|=\s)/.test(text)) {
            try {
                const results = await this.metta.run(text);
                results?.length && this.dispatchMessage({
                    type: 'agent/result',
                    payload: { result: results.map(r => r.toString()).join('\n') }
                });
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
        if (!this.messageHandlers.has(type)) this.messageHandlers.set(type, []);
        this.messageHandlers.get(type).push(handler);
    }

    unsubscribe(type, handler) {
        const handlers = this.messageHandlers.get(type);
        if (!handlers) return;
        const index = handlers.indexOf(handler);
        index > -1 && handlers.splice(index, 1);
    }

    disconnect() {
        this.connectionStatus = 'disconnected';
        this.notifyStatusChange('disconnected');
    }

    // Helper to dispatch to internal subscribers (UI)
    dispatchMessage(message) {
        const handlers = [...(this.messageHandlers.get(message.type) || []), ...(this.messageHandlers.get('*') || [])];
        handlers.forEach(h => { try { h(message); } catch (e) { console.error("Handler error", e); } });
    }

    updateStatus(status) {
        this.connectionStatus = status;
        this.notifyStatusChange(status);
    }

    notifyStatusChange(status) {
        this.messageHandlers.get('connection.status')?.forEach(h => h(status));
    }
}
