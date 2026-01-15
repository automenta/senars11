/**
 * CoreRegistry.js - Core operation registry
 */

import { sym, exp } from '../../kernel/Term.js';
import { Unify } from '../../kernel/Unify.js';
import { OperationNotFoundError } from '../../errors/MeTTaErrors.js';

export class CoreRegistry {
    constructor() {
        this.operations = new Map();
    }

    /**
     * Register a new operation
     */
    register(name, fn, options = {}) {
        this.operations.set(this._normalize(name), { fn, options });
        return this;
    }

    /**
     * Check if an operation exists
     */
    has(name) {
        return this.operations.has(this._normalize(name));
    }

    /**
     * Check if an operation is lazy
     */
    isLazy(name) {
        return !!this.operations.get(this._normalize(name))?.options?.lazy;
    }

    /**
     * Execute an operation
     */
    execute(name, ...args) {
        const norm = this._normalize(name);
        const op = this.operations.get(norm);
        if (!op) throw new OperationNotFoundError(name);
        return op.fn(...args);
    }

    /**
     * Get all registered operation names
     */
    getOperations() {
        return Array.from(this.operations.keys());
    }

    /**
     * Alias for getOperations
     */
    list() {
        return this.getOperations();
    }

    /**
     * Clear all operations
     */
    clear() {
        this.operations.clear();
    }

    /**
     * Normalize operation name (ensure it starts with &)
     */
    _normalize(name) {
        return name.startsWith('&') ? name : `&${name}`;
    }
}