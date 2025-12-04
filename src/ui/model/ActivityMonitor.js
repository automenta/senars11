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
        // --- Core Reasoning Events ---
        this._addListener('reasoning.derivation', data => this._add(ActivityTypes.REASONING.DERIVATION, {
            term: data.derivedTask?.term?.toString(),
            truth: data.derivedTask?.truth,
            rule: data.rule,
            stamp: data.derivedTask?.stamp
        }));

        this._addListener('task.focus', data => this._add(ActivityTypes.REASONING.FOCUS, {
            term: data.task?.term?.toString() || JSON.stringify(data.task || data),
            truth: data.task?.truth,
            task: data.task
        }));

        // --- I/O & Goals ---
        this._addListener('task.input', data => {
             const type = data.source === 'user' ? ActivityTypes.IO.USER_INPUT : ActivityTypes.REASONING.GOAL;
             this._add(type, {
                text: data.task?.toString() || data.input,
                term: data.task?.term?.toString()
            });
        });

        this._addListener('narsese.output', data => this._add(ActivityTypes.IO.SYSTEM_OUTPUT, { text: data }));

        // --- Agent Cognitive Events ---
        this._addListener('agent.action', data => this._add(ActivityTypes.AGENT.ACTION, data));
        this._addListener('agent.decision', data => this._add(ActivityTypes.AGENT.DECISION, data));
        this._addListener('hybrid.reasoning', data => this._add(ActivityTypes.AGENT.HYBRID, data));

        // --- LLM Events ---
        this._addListener('llm.prompt', data => this._add(ActivityTypes.LLM.PROMPT, {
            text: typeof data === 'string' ? data : JSON.stringify(data)
        }));

        this._addListener('llm.response', data => this._add(ActivityTypes.LLM.RESPONSE, {
            text: typeof data === 'string' ? data : data.content
        }));

        // --- Errors ---
        const errorHandler = (type) => (data) => this._add(ActivityTypes.SYSTEM.ERROR, {
            error: data.error || data,
            context: type
        });
        this._addListener('narsese.error', errorHandler('narsese'));
        this._addListener('command.error', errorHandler('command'));
    }

    _add(type, payload) {
        this.model.addActivity({ type, payload });
    }

    _addListener(event, handler) {
        if (!this.engine.on) return;
        const safeHandler = (data) => {
            try { handler(data); } catch (e) { console.error(`Monitor error (${event}):`, e); }
        };
        this.engine.on(event, safeHandler);
        this._handlers.set(event, safeHandler);
    }

    _removeListeners() {
        if (!this.engine.off) return;
        for (const [event, handler] of this._handlers) {
            this.engine.off(event, handler);
        }
        this._handlers.clear();
    }
}
