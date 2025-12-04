import {ActivityTypes} from './ActivityTypes.js';

/**
 * ActivityMonitor listens to system events and populates the ActivityModel.
 * It serves as the bridge between the Core and the UI Model.
 */
export class ActivityMonitor {
    constructor(engine, model) {
        this.engine = engine;
        this.model = model;
        this.isMonitoring = false;

        // Bind handlers
        this._handlers = new Map();
    }

    start() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this._setupListeners();
    }

    stop() {
        this.isMonitoring = false;
        this._removeListeners();
    }

    _setupListeners() {
        // NAR Events
        this._addListener('reasoning.derivation', (data) => {
            this.model.addActivity({
                type: ActivityTypes.REASONING.DERIVATION,
                payload: {
                    term: data.derivedTask?.term?.toString(),
                    truth: data.derivedTask?.truth,
                    rule: data.rule,
                    stamp: data.derivedTask?.stamp
                }
            });
        });

        this._addListener('task.input', (data) => {
             // Handle user input vs system input
             const type = data.source === 'user' ? ActivityTypes.IO.USER_INPUT : ActivityTypes.REASONING.GOAL; // Simplification
             this.model.addActivity({
                type: type,
                payload: {
                    text: data.task?.toString() || data.input,
                    term: data.task?.term?.toString()
                }
            });
        });

        // Agent/LLM Events (if engine supports them)
        this._addListener('llm.prompt', (data) => {
            this.model.addActivity({
                type: ActivityTypes.LLM.PROMPT,
                payload: {
                    text: typeof data === 'string' ? data : JSON.stringify(data)
                }
            });
        });

        this._addListener('llm.response', (data) => {
            this.model.addActivity({
                type: ActivityTypes.LLM.RESPONSE,
                payload: {
                    text: typeof data === 'string' ? data : data.content
                }
            });
        });

        // System Output (from console interception or explicit events)
        this._addListener('narsese.output', (data) => {
             this.model.addActivity({
                type: ActivityTypes.IO.SYSTEM_OUTPUT,
                payload: { text: data }
            });
        });
    }

    _addListener(event, handler) {
        if (!this.engine.on) return;

        const boundHandler = (data) => {
            try {
                handler(data);
            } catch (e) {
                console.error(`Error handling event ${event}:`, e);
            }
        };

        this.engine.on(event, boundHandler);
        this._handlers.set(event, boundHandler);
    }

    _removeListeners() {
        if (!this.engine.off) return;

        for (const [event, handler] of this._handlers) {
            this.engine.off(event, handler);
        }
        this._handlers.clear();
    }
}
