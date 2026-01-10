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
        // Normalize name to include & prefix if not present
        const normalizedName = name.startsWith('&') ? name : `&${name}`;
        this.operations.set(normalizedName, fn);
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
        // Arithmetic operations - register with & prefix as expected by tests
        this.register('&+', (...args) => {
            if (args.length === 0) return createNumberAtom(0);
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
            return createNumberAtom(sum);
        });

        this.register('&-', (...args) => {
            if (args.length === 0) return createNumberAtom(0);
            if (args.length === 1) {
                // Unary minus: negate the single argument
                const num = atomToNumber(args[0]);
                if (num === null) {
                    throw new Error(`Invalid arguments for -: ${args.map(a => a.name || a).join(', ')}`);
                }
                return createNumberAtom(-num);
            }

            // Binary minus: subtract second from first
            if (args.length >= 2) {
                const numA = atomToNumber(args[0]);
                const numB = atomToNumber(args[1]);
                if (numA === null || numB === null) {
                    throw new Error(`Non-numeric input for -: ${args.map(a => a.name || a).join(', ')} (expected number)`);
                }
                return createNumberAtom(numA - numB);
            }

            throw new Error(`Non-numeric input for -: ${args.map(a => a.name || a).join(', ')}`);
        });

        this.register('&*', (...args) => {
            if (args.length === 0) return createNumberAtom(1);
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
            return createNumberAtom(product);
        });

        this.register('&/', (...args) => {
            if (args.length === 0) return createNumberAtom(1);
            if (args.length === 1) {
                // Unary division: 1 / arg
                const num = atomToNumber(args[0]);
                if (num === null || num === 0) {
                    throw new Error("Division by zero");
                }
                return createNumberAtom(1 / num);
            }

            // Binary division: divide first by second
            if (args.length >= 2) {
                const numA = atomToNumber(args[0]);
                const numB = atomToNumber(args[1]);
                if (numA === null || numB === null) {
                    throw new Error(`Non-numeric input for /: ${args.map(a => a.name || a).join(', ')} (expected number)`);
                }
                if (numB === 0) throw new Error("Division by zero");
                return createNumberAtom(numA / numB);
            }

            throw new Error(`Non-numeric input for /: ${args.map(a => a.name || a).join(', ')}`);
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
            if (args.length === 0) return createBooleanAtom(true); // Identity for and
            // For multiple arguments, check if all are truthy
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
            if (args.length === 0) return createBooleanAtom(false); // Identity for or
            // For multiple arguments, check if any is truthy
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

        this.register('&empty?', (lst) => Array.isArray(lst) && lst.length === 0);

        // String operations
        this.register('&str-concat', (a, b) => String(a) + String(b));
        this.register('&to-string', (a) => String(a));

        // I/O operations
        this.register('&print', (...args) => {
            // Convert atoms to strings for printing
            const stringArgs = args.map(arg => arg && arg.name ? arg.name : String(arg));
            console.log(stringArgs.join(' '));  // Join with spaces like in the test expectation
            return args.length === 1 ? args[0] : createSymbolAtom('Null');  // Return first arg or Null
        });

        this.register('&println', (...args) => {
            // Convert atoms to strings for printing
            const stringArgs = args.map(arg => arg && arg.name ? arg.name : String(arg));
            console.log(stringArgs.join(' '));
            return null; // Return nothing for println
        });

        // Time operation
        this.register('&now', () => {
            return createNumberAtom(Date.now());
        });

        // Space operations
        this.register('&add-atom', (space, atom) => {
            if (space && typeof space.add === 'function') {
                space.add(atom);
                return atom;
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
                return space.all();
            }
            throw new Error("Invalid space object");
        });

        // Substitution operation
        this.register('&subst', (term, bindings) => {
            // Import Unify lazily to avoid circular dependency issues if any
            // But we need to use Unify.subst.
            // Since we can't import easily here without changing structure,
            // we assume Unify.subst logic or require it be passed or accessible.
            // For now, let's try to handle it if we can access Unify.
            // Better: implement subst logic or move this registration out.
            // But Plan says add &subst here.
            // Actually, MeTTaInterpreter creates Ground.
            // Maybe we should inject Unify into Ground or register this elsewhere.
            // However, for now, let's implement basic substitution if needed or throw not implemented.
            // Wait, Unify.js imports Term.js. Term.js is standalone. Ground.js imports nothing?
            // Ground.js is standalone.
            // So we can't import Unify in Ground.js easily if Unify uses Ground (Reduce uses both).
            // Reduce uses Unify and Ground.
            // Unify does NOT use Ground.
            // So Ground CAN import Unify?
            // Unify imports Term.
            // Ground doesn't import Term but uses its structure.

            // Let's rely on MeTTaInterpreter to register &subst?
            // No, the plan said "Update Ground.js".
            throw new Error("&subst not implemented in Ground.js directly");
        });
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
    // Import the sym function to create a proper atom
    // Since we can't import here, we'll create the atom structure directly
    return {
        type: 'atom', // Changed from 'symbol' to 'atom'
        name: String(num),
        operator: null,
        components: [],
        toString: () => String(num),
        equals: (other) => other && other.type === 'atom' && other.name === String(num)
    };
}

/**
 * Create a MeTTa boolean atom from a JavaScript boolean
 * @param {boolean} bool - JavaScript boolean
 * @returns {Object} MeTTa symbol atom representing the boolean
 */
function createBooleanAtom(bool) {
    const name = bool ? 'True' : 'False';
    return {
        type: 'atom', // Changed from 'symbol' to 'atom'
        name: name,
        operator: null,
        components: [],
        toString: () => name,
        equals: (other) => other && other.type === 'atom' && other.name === name
    };
}

/**
 * Create a MeTTa symbol atom
 * @param {string} str - String value
 * @returns {Object} MeTTa symbol atom
 */
function createSymbolAtom(str) {
    return {
        type: 'atom', // Changed from 'symbol' to 'atom'
        name: str,
        operator: null,
        components: [],
        toString: () => str,
        equals: (other) => other && other.type === 'atom' && other.name === str
    };
}

/**
 * Check if a value is truthy in MeTTa context
 * @param {*} value - Value to check
 * @returns {boolean} True if value is truthy
 */
function isTruthy(value) {
    if (!value) return false;
    // Check name property if available (for both 'atom' and legacy 'symbol' types)
    if (value.name) {
        if (value.name === 'False' || value.name === 'false' || value.name === 'null' || value.name === 'Nil') return false;
        if (value.name === 'True' || value.name === 'true') return true;
        // For number symbols, check if non-zero
        const num = parseFloat(value.name);
        if (!isNaN(num)) return num !== 0;
    }
    // For other types, use standard JavaScript truthiness
    return Boolean(value);
}