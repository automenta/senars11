/**
 * GroundedAtoms.js - MeTTa grounded atom implementation
 * Bridges MeTTa grounded atoms to SeNARS FunctorRegistry
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';

/**
 * GroundedAtoms - Registry for grounded (executable) atoms
 * Provides built-in operations and bridges to FunctorRegistry
 */
export class GroundedAtoms extends BaseMeTTaComponent {
    constructor(functorRegistry, config = {}, eventBus = null, termFactory = null) {
        super(config, 'GroundedAtoms', eventBus, termFactory);
        this.functorRegistry = functorRegistry;
        this.grounded = new Map(); // name -> executor function
        this.spaces = new Map(); // Named spaces
        this._registerBuiltins();
    }

    /**
     * Register built-in grounded atoms
     * @private
     */
    _registerBuiltins() {
        // Helper: Extract number from term
        const toNum = (term) => Number(term.name ?? term);

        // Helper: Create boolean term
        const boolTerm = (value) => value ? this.termFactory.createTrue() : this.termFactory.createFalse();

        // Helper: Normalize grounded atom name
        const normalizeName = (name) => name.startsWith('&') ? name : `&${name}`;

        // Self reference
        this.register('&self', () => this.getCurrentSpace());

        // Arithmetic operations (data-driven)
        const arithmeticOps = [
            ['+', (...args) => args.map(toNum).reduce((a, b) => a + b, 0)],
            ['-', (...args) => args.map(toNum).reduce((a, b) => a - b)],
            ['*', (...args) => args.map(toNum).reduce((a, b) => a * b, 1)],
            ['/', (a, b) => toNum(a) / toNum(b)]
        ];

        arithmeticOps.forEach(([op, fn]) => {
            this.register(`&${op}`, (...args) => this.termFactory.atomic(String(fn(...args))));
        });

        // Comparison operations (data-driven)
        const comparisonOps = [
            ['<', (a, b) => toNum(a) < toNum(b)],
            ['>', (a, b) => toNum(a) > toNum(b)],
            ['==', (a, b) => (a.name ?? a) === (b.name ?? b)]
        ];

        comparisonOps.forEach(([op, fn]) => {
            this.register(`&${op}`, (a, b) => boolTerm(fn(a, b)));
        });

        // Boolean operations
        this.register('&and', (...args) => boolTerm(args.every(a => (a.name ?? a) === 'True')));
        this.register('&or', (...args) => boolTerm(args.some(a => (a.name ?? a) === 'True')));
        this.register('&not', (a) => boolTerm((a.name ?? a) !== 'True'));
    }

    /**
     * Normalize grounded atom name (add & prefix if missing)
     * @param {string} name - Name
     * @returns {string} - Normalized name
     * @private
     */
    _normalizeName(name) {
        return name.startsWith('&') ? name : `&${name}`;
    }

    /**
     * Register a grounded atom
     * @param {string} name - Name (with & prefix)
     * @param {Function} executor - Executor function
     */
    register(name, executor) {
        this.trackOperation('register', () => {
            const normalizedName = this._normalizeName(name);
            this.grounded.set(normalizedName, executor);
            this.emitMeTTaEvent('grounded-registered', { name: normalizedName });
        });
    }

    /**
     * Execute a grounded atom
     * @param {string} name - Grounded atom name
     * @param {...any} args - Arguments
     * @returns {*} - Result
     */
    execute(name, ...args) {
        return this.trackOperation('execute', () => {
            const normalizedName = this._normalizeName(name);
            const executor = this.grounded.get(normalizedName);

            if (!executor) {
                throw new Error(`Grounded atom not found: ${normalizedName}`);
            }

            const result = executor(...args);
            this.emitMeTTaEvent('grounded-executed', { name: normalizedName, argCount: args.length });
            return result;
        });
    }

    /**
     * Check if grounded atom exists
     * @param {string} name - Name
     * @returns {boolean}
     */
    has(name) {
        return this.grounded.has(this._normalizeName(name));
    }

    /**
     * Get current space (for &self)
     * @returns {Object|null}
     */
    getCurrentSpace() {
        return this.spaces.get('default') ?? null;
    }

    /**
     * Set a named space
     * @param {string} name - Space name
     * @param {Object} space - Space object
     */
    setSpace(name, space) {
        this.spaces.set(name, space);
    }

    /**
     * Get stats
     * @returns {Object}
     */
    getStats() {
        return {
            ...super.getStats(),
            groundedCount: this.grounded.size,
            spaceCount: this.spaces.size
        };
    }
}
