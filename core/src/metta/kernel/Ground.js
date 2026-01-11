/**
 * Ground.js - Native function registry
 * Registry for grounded operations in MeTTa
 */

import { sym } from './Term.js';

export class Ground {
    constructor() {
        this.operations = new Map();
        this._registerCoreOperations();
    }

    /**
     * Register a grounded operation
     * @param {string} name - Operation name
     * @param {Function} fn - Function to execute
     * @param {Object} options - Options { lazy: boolean }
     * @returns {Ground} This instance for chaining
     */
    register(name, fn, options = {}) {
        // Normalize name to include & prefix if not present
        const normalizedName = name.startsWith('&') ? name : `&${name}`;
        this.operations.set(normalizedName, { fn, options });
        return this;
    }

    /**
     * Check if operation exists
     * @param {string} name - Operation name
     * @returns {boolean} True if operation exists
     */
    has(name) {
        // Normalize name to include & prefix if not present
        const normalizedName = name.startsWith('&') ? name : `&${name}`;
        return this.operations.has(normalizedName);
    }

    /**
     * Check if operation is lazy (does not require argument reduction)
     * @param {string} name - Operation name
     * @returns {boolean} True if lazy
     */
    isLazy(name) {
        const normalizedName = name.startsWith('&') ? name : `&${name}`;
        const op = this.operations.get(normalizedName);
        return op && op.options && op.options.lazy;
    }

    /**
     * Execute a grounded operation
     * @param {string} name - Operation name
     * @param {...*} args - Arguments to pass to operation
     * @returns {*} Result of operation execution
     */
    execute(name, ...args) {
        // Normalize name to include & prefix if not present
        const normalizedName = name.startsWith('&') ? name : `&${name}`;

        if (!this.operations.has(normalizedName)) {
            throw new Error(`Operation ${name} not found`);
        }

        const op = this.operations.get(normalizedName);
        return op.fn(...args);
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
        this.register('&+', (...args) => {
            if (args.length === 0) return sym('0');
            if (args.length === 1) return args[0]; // Identity for single argument

            // For multiple arguments, sum them all
            let sum = 0;
            for (const arg of args) {
                const num = atomToNumber(arg);
                if (num === null) {
                    throw new Error(`Non-numeric input for +: ${args.map(a => a.name || a).join(', ')} (expected number)`);
                }
                sum += num;
            }
            return sym(String(sum));
        });

        this.register('&-', (...args) => {
            if (args.length === 0) return sym('0');
            if (args.length === 1) {
                // Unary minus: negate the single argument
                const num = atomToNumber(args[0]);
                if (num === null) {
                    throw new Error(`Invalid arguments for -: ${args.map(a => a.name || a).join(', ')}`);
                }
                return sym(String(-num));
            }

            // Binary minus: subtract second from first
            if (args.length >= 2) {
                const numA = atomToNumber(args[0]);
                const numB = atomToNumber(args[1]);
                if (numA === null || numB === null) {
                    throw new Error(`Non-numeric input for -: ${args.map(a => a.name || a).join(', ')} (expected number)`);
                }
                return sym(String(numA - numB));
            }

            throw new Error(`Non-numeric input for -: ${args.map(a => a.name || a).join(', ')}`);
        });

        this.register('&*', (...args) => {
            if (args.length === 0) return sym('1');
            if (args.length === 1) return args[0]; // Identity for single argument

            // For multiple arguments, multiply them all
            let product = 1;
            for (const arg of args) {
                const num = atomToNumber(arg);
                if (num === null) {
                    throw new Error(`Non-numeric input for *: ${args.map(a => a.name || a).join(', ')} (expected number)`);
                }
                product *= num;
            }
            return sym(String(product));
        });

        this.register('&/', (...args) => {
            if (args.length === 0) return sym('1');
            if (args.length === 1) {
                // Unary division: 1 / arg
                const num = atomToNumber(args[0]);
                if (num === null || num === 0) {
                    throw new Error("Division by zero");
                }
                return sym(String(1 / num));
            }

            // Binary division: divide first by second
            if (args.length >= 2) {
                const numA = atomToNumber(args[0]);
                const numB = atomToNumber(args[1]);
                if (numA === null || numB === null) {
                    throw new Error(`Non-numeric input for /: ${args.map(a => a.name || a).join(', ')} (expected number)`);
                }
                if (numB === 0) throw new Error("Division by zero");
                return sym(String(numA / numB));
            }

            throw new Error(`Non-numeric input for /: ${args.map(a => a.name || a).join(', ')}`);
        });

        this.register('&%', (...args) => {
            if (args.length !== 2) {
                throw new Error("Modulo operator requires exactly 2 arguments");
            }
            const numA = atomToNumber(args[0]);
            const numB = atomToNumber(args[1]);

            if (numA === null || numB === null) {
                throw new Error("Modulo requires numeric arguments");
            }
            return sym(String(numA % numB));
        });


        // Comparison operations
        this.register('&==', (a, b) => {
            if (a && a.equals) return createBooleanAtom(a.equals(b));
            return createBooleanAtom(a === b);
        });

        this.register('&!=', (a, b) => {
            if (a && a.equals) return createBooleanAtom(!a.equals(b));
            return createBooleanAtom(a !== b);
        });

        this.register('&<', (a, b) => {
            const numA = atomToNumber(a);
            const numB = atomToNumber(b);
            if (numA !== null && numB !== null) {
                return createBooleanAtom(numA < numB);
            }
            throw new Error(`Non-numeric input for <: ${a.name || a}, ${b.name || b} (expected number)`);
        });

        this.register('&>', (a, b) => {
            const numA = atomToNumber(a);
            const numB = atomToNumber(b);
            if (numA !== null && numB !== null) {
                return createBooleanAtom(numA > numB);
            }
            throw new Error(`Non-numeric input for >: ${a.name || a}, ${b.name || b} (expected number)`);
        });

        this.register('&<=', (a, b) => {
            const numA = atomToNumber(a);
            const numB = atomToNumber(b);
            if (numA !== null && numB !== null) {
                return createBooleanAtom(numA <= numB);
            }
            throw new Error(`Non-numeric input for <=: ${a.name || a}, ${b.name || b} (expected number)`);
        });

        this.register('&>=', (a, b) => {
            const numA = atomToNumber(a);
            const numB = atomToNumber(b);
            if (numA !== null && numB !== null) {
                return createBooleanAtom(numA >= numB);
            }
            throw new Error(`Non-numeric input for >=: ${a.name || a}, ${b.name || b} (expected number)`);
        });

        // Logical operations
        this.register('&and', (...args) => {
            if (args.length === 0) return createBooleanAtom(true);
            for (const arg of args) {
                if (arg && (arg.type === 'symbol' || arg.type === 'atom') && arg.name === 'False') {
                    return createBooleanAtom(false);
                }
                if (!isTruthy(arg)) {
                    return createBooleanAtom(false);
                }
            }
            return createBooleanAtom(true);
        });

        this.register('&or', (...args) => {
            if (args.length === 0) return createBooleanAtom(false);
            for (const arg of args) {
                if (arg && (arg.type === 'symbol' || arg.type === 'atom') && arg.name === 'True') {
                    return createBooleanAtom(true);
                }
                if (isTruthy(arg)) {
                    return createBooleanAtom(true);
                }
            }
            return createBooleanAtom(false);
        });

        this.register('&not', (a) => {
            if (a && (a.type === 'symbol' || a.type === 'atom') && a.name === 'True') {
                return createBooleanAtom(false);
            } else if (a && (a.type === 'symbol' || a.type === 'atom') && a.name === 'False') {
                return createBooleanAtom(true);
            } else {
                return createBooleanAtom(!isTruthy(a));
            }
        });

        // List operations
        this.register('&first', (lst) => {
            if (Array.isArray(lst) && lst.length > 0) return lst[0];
            return null;
        });

        this.register('&rest', (lst) => {
            if (Array.isArray(lst) && lst.length > 0) return lst.slice(1);
            return [];
        });

        this.register('&empty?', (lst) => {
            let isEmpty = false;
            if (Array.isArray(lst)) {
                isEmpty = lst.length === 0;
            } else if (lst && lst.type === 'atom' && lst.name === '()') {
                isEmpty = true;
            } else if (lst && lst.type === 'symbol' && lst.name === '()') { // Legacy support
                isEmpty = true;
            }
            return createBooleanAtom(isEmpty);
        });

        // String operations
        this.register('&str-concat', (a, b) => String(a) + String(b));
        this.register('&to-string', (a) => String(a));

        // I/O operations
        this.register('&print', (...args) => {
            const stringArgs = args.map(arg => arg && arg.name ? arg.name : String(arg));
            console.log(stringArgs.join(' '));
            return args.length === 1 ? args[0] : sym('Null');
        });

        this.register('&println', (...args) => {
            const stringArgs = args.map(arg => arg && arg.name ? arg.name : String(arg));
            console.log(stringArgs.join(' '));
            return null;
        });

        // Time operation
        this.register('&now', () => {
            return sym(String(Date.now()));
        });

        // Space operations
        this.register('&add-atom', (space, atom) => {
            if (space && typeof space.add === 'function') {
                space.add(atom);
                return atom;
            }
            // Fallback if space is not the first argument but maybe implied? No, explicit passing required.
            if (atom === undefined && space && space.type === 'atom') {
                throw new Error("Missing space argument or invalid atom");
            }
            throw new Error("Invalid space object");
        });

        this.register('&rm-atom', (space, atom) => {
            if (space && typeof space.remove === 'function') {
                return space.remove(atom);
            }
            throw new Error("Invalid space object");
        });

        this.register('&get-atoms', (space) => {
            if (space && typeof space.all === 'function') {
                const atoms = space.all();
                // Convert JS array to MeTTa list (: h (: t ...))
                const listify = (arr) => {
                    if (arr.length === 0) return sym('()');
                    return {
                        type: 'compound',
                        name: `(: ${arr[0].name} ...)`,
                        operator: sym(':'),
                        components: [arr[0], listify(arr.slice(1))],
                        toString: () => `(: ${arr[0]} ${listify(arr.slice(1))})`,
                        equals: (other) => false
                    };
                };
                return listify(atoms);
            }
            throw new Error("Invalid space object");
        });

        // Introspection Primitives (Phase 3)
        const stiMap = new Map();

        this.register('&get-sti', (atom) => {
            const key = atom.toString();
            return sym(String(stiMap.get(key) || 0));
        });

        this.register('&set-sti', (atom, value) => {
            const key = atom.toString();
            const num = atomToNumber(value);
            if (num !== null) {
                stiMap.set(key, num);
                return value;
            }
            return sym('0');
        });

        this.register('&system-stats', () => {
            return {
                type: 'atom',
                name: 'Stats',
                toString: () => `(Stats :sti-count ${stiMap.size})`
            };
        });

        // Placeholders for advanced ops that should be overridden by Interpreter
        this.register('&subst', (term, bindings) => { throw new Error("&subst should be provided by Interpreter"); });
        this.register('&match', (space, pattern, template) => { throw new Error("&match should be provided by Interpreter"); });
        this.register('&type-of', (atom) => { throw new Error("&type-of should be provided by Interpreter"); });
    }

    /**
     * Get list of all registered operations
     * @returns {Array} Array of operation names
     */
    list() {
        return Array.from(this.operations.keys());
    }

    /**
     * Clear all operations
     */
    clear() {
        this.operations.clear();
    }
}

/**
 * Convert a MeTTa atom to a JavaScript number
 * @param {Object} atom - MeTTa atom
 * @returns {number|null} JavaScript number or null if conversion fails
 */
function atomToNumber(atom) {
    if (atom === null || atom === undefined) return null;
    if (typeof atom === 'number') return atom;
    if (atom.name) {
        const num = parseFloat(atom.name);
        return isNaN(num) ? null : num;
    }
    return null;
}

function createBooleanAtom(bool) {
    return sym(bool ? 'True' : 'False');
}

function isTruthy(value) {
    if (!value) return false;
    if (value.name) {
        if (value.name === 'False' || value.name === 'false' || value.name === 'null' || value.name === 'Nil') return false;
        if (value.name === 'True' || value.name === 'true') return true;
        const num = parseFloat(value.name);
        if (!isNaN(num)) return num !== 0;
    }
    return Boolean(value);
}
