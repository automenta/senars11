/**
 * Minimal MeTTa Kernel - Grounded Operations
 * 
 * Registry for native JavaScript functions callable from MeTTa.
 * Includes arithmetic, comparison, logic, and I/O operations.
 */

import { Term } from './Term.js';

/**
 * Grounded operations registry
 */
export class Ground {
    constructor() {
        this.registry = new Map();
        this.registerBuiltins();
    }

    /**
     * Register a grounded operation
     * @param {string} name - Operation name (will add & prefix if missing)
     * @param {function} fn - Function to execute
     */
    register(name, fn) {
        const normalized = name.startsWith('&') ? name : `&${name}`;
        this.registry.set(normalized, fn);
    }

    /**
     * Execute a grounded operation
     * @param {string} name - Operation name
     * @param {...object} args - Arguments (terms)
     * @returns {object} Result term
     */
    execute(name, ...args) {
        const normalized = name.startsWith('&') ? name : `&${name}`;
        const fn = this.registry.get(normalized);

        if (!fn) {
            throw new Error(`Grounded operation not found: ${normalized}`);
        }

        return fn(...args);
    }

    /**
     * Check if operation is registered
     * @param {string} name - Operation name
     * @returns {boolean} True if registered
     */
    has(name) {
        const normalized = name.startsWith('&') ? name : `&${name}`;
        return this.registry.has(normalized);
    }

    /**
     * Get all registered operation names
     * @returns {Array} Array of operation  names
     */
    list() {
        return Array.from(this.registry.keys());
    }

    /**
     * Clear all registered operations
     */
    clear() {
        this.registry.clear();
    }

    /**
     * Register built-in operations
     */
    registerBuiltins() {
        // Arithmetic operations
        this.register('&+', (...args) => {
            const nums = args.map(extractNumber);
            const result = nums.reduce((a, b) => a + b, 0);
            return Term.sym(String(result));
        });

        this.register('&-', (...args) => {
            const nums = args.map(extractNumber);
            const result = nums.length === 1 ? -nums[0] : nums.reduce((a, b) => a - b);
            return Term.sym(String(result));
        });

        this.register('&*', (...args) => {
            const nums = args.map(extractNumber);
            const result = nums.reduce((a, b) => a * b, 1);
            return Term.sym(String(result));
        });

        this.register('&/', (a, b) => {
            const num1 = extractNumber(a);
            const num2 = extractNumber(b);
            if (num2 === 0) throw new Error('Division by zero');
            return Term.sym(String(num1 / num2));
        });

        // Comparison operations
        this.register('&<', (a, b) => {
            const num1 = extractNumber(a);
            const num2 = extractNumber(b);
            return num1 < num2 ? Term.sym('True') : Term.sym('False');
        });

        this.register('&>', (a, b) => {
            const num1 = extractNumber(a);
            const num2 = extractNumber(b);
            return num1 > num2 ? Term.sym('True') : Term.sym('False');
        });

        this.register('&==', (a, b) => {
            const name1 = a?.name ?? String(a);
            const name2 = b?.name ?? String(b);
            return name1 === name2 ? Term.sym('True') : Term.sym('False');
        });

        // Logical operations
        this.register('&and', (...args) => {
            const allTrue = args.every(a => (a?.name ?? String(a)) === 'True');
            return allTrue ? Term.sym('True') : Term.sym('False');
        });

        this.register('&or', (...args) => {
            const anyTrue = args.some(a => (a?.name ?? String(a)) === 'True');
            return anyTrue ? Term.sym('True') : Term.sym('False');
        });

        this.register('&not', (a) => {
            const isTrue = (a?.name ?? String(a)) === 'True';
            return isTrue ? Term.sym('False') : Term.sym('True');
        });

        // I/O operations
        this.register('&print', (...args) => {
            const output = args.map(a => a?.toString?.() ?? String(a)).join(' ');
            console.log(output);
            return Term.sym('Null');
        });

        this.register('&now', () => {
            return Term.sym(String(Date.now()));
        });
    }
}

/**
 * Extract numeric value from a term
 * @param {object} term - Term to extract from
 * @returns {number} Numeric value
 */
function extractNumber(term) {
    const value = term?.name ?? String(term);
    const num = Number(value);

    if (isNaN(num)) {
        throw new Error(`Expected number, got: ${value}`);
    }

    return num;
}
