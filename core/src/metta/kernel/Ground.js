/**
 * Ground.js - Native function registry
 * Registry for grounded operations in MeTTa
 */

export class Ground {
    constructor() {
        this.operations = new Map();
        this._registerCoreOperations();
    }

    /**
     * Register a grounded operation
     * @param {string} name - Operation name
     * @param {Function} fn - Function to execute
     * @returns {Ground} This instance for chaining
     */
    register(name, fn) {
        this.operations.set(name, fn);
        return this;
    }

    /**
     * Check if operation exists
     * @param {string} name - Operation name
     * @returns {boolean} True if operation exists
     */
    has(name) {
        return this.operations.has(name);
    }

    /**
     * Execute a grounded operation
     * @param {string} name - Operation name
     * @param {Array} args - Arguments to pass to operation
     * @returns {*} Result of operation execution
     */
    execute(name, args) {
        if (!this.operations.has(name)) {
            throw new Error(`Unknown grounded operation: ${name}`);
        }
        
        const op = this.operations.get(name);
        return op(...args);
    }

    /**
     * Get all registered operation names
     * @returns {Array} Array of operation names
     */
    getOperations() {
        return Array.from(this.operations.keys());
    }

    /**
     * Register core operations
     * @private
     */
    _registerCoreOperations() {
        // Arithmetic operations
        this.register('+', (a, b) => {
            const numA = atomToNumber(a);
            const numB = atomToNumber(b);
            if (numA !== null && numB !== null) {
                return createNumberAtom(numA + numB);
            }
            throw new Error(`Invalid arguments for +: ${a}, ${b}`);
        });

        this.register('-', (a, b) => {
            const numA = atomToNumber(a);
            const numB = atomToNumber(b);
            if (numA !== null && numB !== null) {
                return createNumberAtom(numA - numB);
            }
            throw new Error(`Invalid arguments for -: ${a}, ${b}`);
        });

        this.register('*', (a, b) => {
            const numA = atomToNumber(a);
            const numB = atomToNumber(b);
            if (numA !== null && numB !== null) {
                return createNumberAtom(numA * numB);
            }
            throw new Error(`Invalid arguments for *: ${a}, ${b}`);
        });

        this.register('/', (a, b) => {
            const numA = atomToNumber(a);
            const numB = atomToNumber(b);
            if (numA !== null && numB !== null) {
                if (numB === 0) throw new Error("Division by zero");
                return createNumberAtom(numA / numB);
            }
            throw new Error(`Invalid arguments for /: ${a}, ${b}`);
        });

        // Comparison operations
        this.register('==', (a, b) => {
            if (a && a.equals) return a.equals(b);
            return a === b;
        });

        this.register('!=', (a, b) => {
            if (a && a.equals) return !a.equals(b);
            return a !== b;
        });

        this.register('<', (a, b) => {
            if (typeof a === 'number' && typeof b === 'number') {
                return a < b;
            }
            throw new Error(`Invalid arguments for <: ${a}, ${b}`);
        });

        this.register('>', (a, b) => {
            if (typeof a === 'number' && typeof b === 'number') {
                return a > b;
            }
            throw new Error(`Invalid arguments for >: ${a}, ${b}`);
        });

        this.register('<=', (a, b) => {
            if (typeof a === 'number' && typeof b === 'number') {
                return a <= b;
            }
            throw new Error(`Invalid arguments for <=: ${a}, ${b}`);
        });

        this.register('>=', (a, b) => {
            if (typeof a === 'number' && typeof b === 'number') {
                return a >= b;
            }
            throw new Error(`Invalid arguments for >=: ${a}, ${b}`);
        });

        // Logical operations
        this.register('and', (a, b) => Boolean(a && b));
        this.register('or', (a, b) => Boolean(a || b));
        this.register('not', (a) => !Boolean(a));

        // List operations
        this.register('first', (lst) => {
            if (Array.isArray(lst) && lst.length > 0) return lst[0];
            return null;
        });

        this.register('rest', (lst) => {
            if (Array.isArray(lst) && lst.length > 0) return lst.slice(1);
            return [];
        });

        this.register('empty?', (lst) => Array.isArray(lst) && lst.length === 0);

        // String operations
        this.register('str-concat', (a, b) => String(a) + String(b));
        this.register('to-string', (a) => String(a));

        // I/O operations
        this.register('print', (...args) => {
            console.log(...args);
            return args.length === 1 ? args[0] : args;
        });

        this.register('println', (...args) => {
            console.log(...args);
            return null; // Return nothing for println
        });

        // Space operations
        this.register('add-atom', (space, atom) => {
            if (space && typeof space.add === 'function') {
                space.add(atom);
                return atom;
            }
            throw new Error("Invalid space object");
        });

        this.register('rm-atom', (space, atom) => {
            if (space && typeof space.remove === 'function') {
                return space.remove(atom);
            }
            throw new Error("Invalid space object");
        });

        this.register('get-atoms', (space) => {
            if (space && typeof space.all === 'function') {
                return space.all();
            }
            throw new Error("Invalid space object");
        });
    }

    /**
     * Clear all operations
     */
    clear() {
        this.operations.clear();
        this._registerCoreOperations();
    }
}

/**
 * Convert a MeTTa atom to a JavaScript number
 * @param {Object} atom - MeTTa atom
 * @returns {number|null} JavaScript number or null if conversion fails
 */
function atomToNumber(atom) {
    if (!atom) return null;

    // If atom is already a number, return it
    if (typeof atom === 'number') return atom;

    // If atom has a name property (like symbols), try to parse it
    if (atom.name) {
        const num = parseFloat(atom.name);
        return isNaN(num) ? null : num;
    }

    return null;
}

/**
 * Create a MeTTa number atom from a JavaScript number
 * @param {number} num - JavaScript number
 * @returns {Object} MeTTa symbol atom representing the number
 */
function createNumberAtom(num) {
    // For now, return the raw number; the caller should handle conversion to atom
    return num;
}