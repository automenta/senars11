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
        const toNum = (term) => Number(term.name ?? term);
        const boolTerm = (value) => value ? this.termFactory.createTrue() : this.termFactory.createFalse();
        const makeNumOp = (op, initial) => (...args) =>
            this.termFactory.atomic(String(args.map(toNum).reduce(op, initial)));
        const makeCmpOp = (op) => (a, b) => boolTerm(op(toNum(a), toNum(b)));

        const operations = {
            '&self': () => this.getCurrentSpace(),
            '+': makeNumOp((a, b) => a + b, 0),
            '-': makeNumOp((a, b) => a - b),
            '*': makeNumOp((a, b) => a * b, 1),
            '/': (a, b) => this.termFactory.atomic(String(toNum(a) / toNum(b))),
            '<': makeCmpOp((a, b) => a < b),
            '>': makeCmpOp((a, b) => a > b),
            '==': (a, b) => boolTerm((a.name ?? a) === (b.name ?? b)),
            '&and': (...args) => boolTerm(args.every(a => (a.name ?? a) === 'True')),
            '&or': (...args) => boolTerm(args.some(a => (a.name ?? a) === 'True')),
            '&not': (a) => boolTerm((a.name ?? a) !== 'True')
        };

        Object.entries(operations).forEach(([name, fn]) => this.register(name, fn));
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

            this.emitMeTTaEvent('grounded-executed', { name: normalizedName, argCount: args.length });
            return executor(...args);
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
