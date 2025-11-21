import {BaseComponent} from '../util/BaseComponent.js';

export class ReasoningTrajectoryLogger extends BaseComponent {
    constructor(config = {}) {
        super(config, 'ReasoningTrajectoryLogger');
        this.episodes = new Map(); // episodeId -> Episode
        this.currentEpisode = null;
        this.nar = null;
        this._handlers = {};
    }

    attachToNAR(nar) {
        if (this.nar) {
            this.detach();
        }
        this.nar = nar;
        this._setupListeners();
    }

    detach() {
        if (!this.nar) return;
        const bus = this.nar._eventBus;
        for (const [event, handler] of Object.entries(this._handlers)) {
            bus.off(event, handler);
        }
        this.nar = null;
        this._handlers = {};
    }

    startNewEpisode(meta = {}) {
        const id = `ep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const episode = {
            id,
            startTime: Date.now(),
            meta,
            steps: [],
            outcome: null
        };
        this.episodes.set(id, episode);
        this.currentEpisode = episode;
        return id;
    }

    endCurrentEpisode(outcome = {}) {
        if (this.currentEpisode) {
            this.currentEpisode.endTime = Date.now();
            this.currentEpisode.outcome = outcome;
            this.currentEpisode = null;
        }
    }

    getEpisode(id) {
        return this.episodes.get(id);
    }

    getAllEpisodes() {
        return Array.from(this.episodes.values());
    }

    _setupListeners() {
        if (!this.nar) return;

        // Helper to add step
        const recordStep = (type, data, options = {}) => {
            if (!this.currentEpisode) return;

            this.currentEpisode.steps.push({
                seq: this.currentEpisode.steps.length + 1,
                timestamp: Date.now(),
                type,
                data: this._sanitizeData(data),
                traceId: options.traceId
            });
        };

        // Define handlers
        this._handlers = {
            'task.input': (data, opts) => recordStep('INPUT', data, opts),
            'reasoning.derivation': (data, opts) => recordStep('DERIVATION', data, opts),
            'task.focus': (data, opts) => recordStep('FOCUS_ADD', {task: data}, opts),
            'streamReasoner.step': (data, opts) => {
                // Only record if there were results to avoid spam
                if (data.results && data.results.length > 0) {
                    recordStep('CYCLE_STEP', data, opts);
                }
            },
            'input.error': (data, opts) => recordStep('ERROR', data, opts)
        };

        // Bind handlers
        const bus = this.nar._eventBus;
        for (const [event, handler] of Object.entries(this._handlers)) {
            bus.on(event, handler);
        }
    }

    _sanitizeData(data) {
        // Prevent circular references or massive objects in logs if necessary
        // For now, just shallow copy or return as is.
        // If Task objects are complex, we might want to convert them to strings/JSON safe objects here.

        if (data && data.task && typeof data.task.toString === 'function') {
            // Create a lightweight representation of the task
            return {
                ...data,
                taskStr: data.task.toString(),
                // Keep original for deep inspection if needed, but be careful with serialization later
            };
        }
        return data;
    }
}
