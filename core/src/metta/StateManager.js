import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';

export class StateManager extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null) {
        super(config, 'StateManager', eventBus, termFactory);
        this.states = new Map();
        this.stateCounter = 0;
    }

    newState(initialValue) {
        return this.trackOperation('newState', () => {
            const id = `state-${this.stateCounter++}`;
            this.states.set(id, initialValue);
            this.emitMeTTaEvent('state-created', { id, initialValue: initialValue?.toString() });
            return id;
        });
    }

    getState(stateId) {
        return this.trackOperation('getState', () => {
            if (!this.states.has(stateId)) throw new Error(`State not found: ${stateId}`);
            return this.states.get(stateId);
        });
    }

    changeState(stateId, newValue) {
        return this.trackOperation('changeState', () => {
            if (!this.states.has(stateId)) throw new Error(`State not found: ${stateId}`);
            const oldValue = this.states.get(stateId);
            this.states.set(stateId, newValue);
            this.emitMeTTaEvent('state-changed', { id: stateId, oldValue: oldValue?.toString(), newValue: newValue?.toString() });
            return newValue;
        });
    }

    hasState(stateId) { return this.states.has(stateId); }

    deleteState(stateId) {
        const deleted = this.states.delete(stateId);
        if (deleted) this.emitMeTTaEvent('state-deleted', { id: stateId });
        return deleted;
    }

    clearStates() {
        this.states.clear();
        this.emitMeTTaEvent('states-cleared', {});
    }

    getStats() { return { ...super.getStats(), stateCount: this.states.size }; }
}
