/**
 * StateManager.js - MeTTa mutable state atoms
 * Implements new-state, get-state, change-state!
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';

/**
 * StateManager - Mutable state for MeTTa
 * Provides state atoms with get/set operations
 */
export class StateManager extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null) {
        super(config, 'StateManager', eventBus, termFactory);
        this.states = new Map(); // stateId -> value
        this.stateCounter = 0;
    }

    /**
     * Create new state atom
     * @param {*} initialValue - Initial state value
     * @returns {string} - State ID
     */
    newState(initialValue) {
        return this.trackOperation('newState', () => {
            const id = `state-${this.stateCounter++}`;
            this.states.set(id, initialValue);

            this.emitMeTTaEvent('state-created', {
                id,
                initialValue: initialValue?.toString()
            });

            return id;
        });
    }

    /**
     * Get current state value
     * @param {string} stateId - State ID
     * @returns {*} - Current value
     */
    getState(stateId) {
        return this.trackOperation('getState', () => {
            const value = this.states.get(stateId);
            if (value === undefined && !this.states.has(stateId)) {
                throw new Error(`State not found: ${stateId}`);
            }
            return value;
        });
    }

    /**
     * Modify state (side effect!)
     * @param {string} stateId - State ID
     * @param {*} newValue - New value
     * @returns {*} - New value
     */
    changeState(stateId, newValue) {
        return this.trackOperation('changeState', () => {
            if (!this.states.has(stateId)) {
                throw new Error(`State not found: ${stateId}`);
            }

            const oldValue = this.states.get(stateId);
            this.states.set(stateId, newValue);

            this.emitMeTTaEvent('state-changed', {
                id: stateId,
                oldValue: oldValue?.toString(),
                newValue: newValue?.toString()
            });

            return newValue;
        });
    }

    /**
     * Check if state exists
     * @param {string} stateId - State ID
     * @returns {boolean}
     */
    hasState(stateId) {
        return this.states.has(stateId);
    }

    /**
     * Delete state
     * @param {string} stateId - State ID
     * @returns {boolean} - true if deleted
     */
    deleteState(stateId) {
        const deleted = this.states.delete(stateId);
        if (deleted) {
            this.emitMeTTaEvent('state-deleted', { id: stateId });
        }
        return deleted;
    }

    /**
     * Clear all states
     */
    clearStates() {
        this.states.clear();
        this.emitMeTTaEvent('states-cleared', {});
    }

    /**
     * Get stats
     * @returns {Object}
     */
    getStats() {
        return {
            ...super.getStats(),
            stateCount: this.states.size
        };
    }
}
