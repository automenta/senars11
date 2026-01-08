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
        // Self reference
        this.register('&self', () => this.getCurrentSpace());

        // Arithmetic operations
        this.register('&+', (...args) => {
            const nums = args.map(a => Number(a.name || a));
            return this.termFactory.atomic(String(nums.reduce((a, b) => a + b, 0)));
        });

        this.register('&-', (...args) => {
            const nums = args.map(a => Number(a.name || a));
            return this.termFactory.atomic(String(nums.reduce((a, b) => a - b)));
        });

        this.register('&*', (...args) => {
            const nums = args.map(a => Number(a.name || a));
            return this.termFactory.atomic(String(nums.reduce((a, b) => a * b, 1)));
        });

        this.register('&/', (a, b) => {
            const num1 = Number(a.name || a);
            const num2 = Number(b.name || b);
            return this.termFactory.atomic(String(num1 / num2));
        });

        // Comparison
        this.register('&<', (a, b) => {
            const num1 = Number(a.name || a);
            const num2 = Number(b.name || b);
            return num1 < num2 ? this.termFactory.createTrue() : this.termFactory.createFalse();
        });

        this.register('&>', (a, b) => {
            const num1 = Number(a.name || a);
            const num2 = Number(b.name || b);
            return num1 > num2 ? this.termFactory.createTrue() : this.termFactory.createFalse();
        });

        this.register('&==', (a, b) => {
            return (a.name || a) === (b.name || b)
                ? this.termFactory.createTrue()
                : this.termFactory.createFalse();
        });

        // Boolean
        this.register('&and', (...args) => {
            const all = args.every(a => (a.name || a) === 'True');
            return all ? this.termFactory.createTrue() : this.termFactory.createFalse();
        });

        this.register('&or', (...args) => {
            const any = args.some(a => (a.name || a) === 'True');
            return any ? this.termFactory.createTrue() : this.termFactory.createFalse();
        });

        this.register('&not', (a) => {
            return (a.name || a) === 'True'
                ? this.termFactory.createFalse()
                : this.termFactory.createTrue();
        });
    }

    /**
     * Register a grounded atom
     * @param {string} name - Name (with & prefix)
     * @param {Function} executor - Executor function
     */
    register(name, executor) {
        this.trackOperation('register', () => {
            if (!name.startsWith('&')) {
                name = `&${name}`;
            }
            this.grounded.set(name, executor);
            this.emitMeTTaEvent('grounded-registered', { name });
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
            if (!name.startsWith('&')) {
                name = `&${name}`;
            }

            const executor = this.grounded.get(name);
            if (!executor) {
                throw new Error(`Grounded atom not found: ${name}`);
            }

            const result = executor(...args);
            this.emitMeTTaEvent('grounded-executed', { name, argCount: args.length });
            return result;
        });
    }

    /**
     * Check if grounded atom exists
     * @param {string} name - Name
     * @returns {boolean}
     */
    has(name) {
        if (!name.startsWith('&')) {
            name = `&${name}`;
        }
        return this.grounded.has(name);
    }

    /**
     * Get current space (for &self)
     * @returns {Object|null}
     */
    getCurrentSpace() {
        return this.spaces.get('default') || null;
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
