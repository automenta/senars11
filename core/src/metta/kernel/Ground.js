/**
 * Ground.js - Native function registry
 * Registry for grounded operations in MeTTa
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { sym, exp } from './Term.js';

export class Ground {
    constructor() {
        this.operations = new Map();
        this._registerCoreOperations();
    }

    // === Core API ===

    register(name, fn, options = {}) {
        const normalizedName = name.startsWith('&') ? name : `&${name}`;
        this.operations.set(normalizedName, { fn, options });
        return this;
    }

    has(name) {
        const normalizedName = name.startsWith('&') ? name : `&${name}`;
        return this.operations.has(normalizedName);
    }

    isLazy(name) {
        const normalizedName = name.startsWith('&') ? name : `&${name}`;
        const op = this.operations.get(normalizedName);
        return !!op?.options?.lazy;
    }

    execute(name, ...args) {
        const normalizedName = name.startsWith('&') ? name : `&${name}`;
        if (!this.operations.has(normalizedName)) {
            throw new Error(`Operation ${name} not found`);
        }
        return this.operations.get(normalizedName).fn(...args);
    }

    getOperations() {
        return Array.from(this.operations.keys());
    }

    // === Registration ===

    _registerCoreOperations() {
        // Arithmetic: +, *, -, /, %
        this._registerArithmeticOps();

        // Comparison: ==, !=, <, >, <=, >=
        this._registerComparisonOps();

        // Logical: and, or, not
        this._registerLogicalOps();

        // List: first, rest, empty?
        this._registerListOps();

        // String: str-concat, to-string
        this._registerStringOps();

        // I/O: print, println
        this._registerIOOps();

        // Time: now
        this.register('&now', () => sym(String(Date.now())));

        // Space: add-atom, rm-atom, get-atoms
        this._registerSpaceOps();

        // Introspection: get-sti, set-sti, system-stats
        this._registerIntrospectionOps();

        // Type system operations
        this._registerTypeOps();

        // Interpreter overrides (placeholder)
        this._registerPlaceholderOps();
    }

    // === Operation Groups ===

    _registerArithmeticOps() {
        // Generic arithmetic factory
        const arithmeticFactory = (initial, op, identity) => (...args) => {
            if (args.length === 0) return sym(String(initial));
            if (args.length === 1) return args[0]; // Identity

            let result = atomToNumber(args[0]);
            if (result === null) throw new Error(`Non-numeric input: ${args[0]} (expected number)`);

            for (let i = 1; i < args.length; i++) {
                const num = atomToNumber(args[i]);
                if (num === null) throw new Error(`Non-numeric input: ${args[i]?.name || args[i]} (expected number)`);
                result = op(result, num);
            }
            return sym(String(result));
        };

        this.register('&+', arithmeticFactory(0, (a, b) => a + b));
        this.register('&*', arithmeticFactory(1, (a, b) => a * b));
        this.register('&-', this._createUnaryBinaryOp('-', (a, b) => a - b, 0));
        this.register('&/', this._createUnaryBinaryOp('/', (a, b) => a / b, 1, true)); // division by zero check
        this.register('&%', (...args) => {
            if (args.length !== 2) throw new Error("Modulo requires 2 args");
            const [a, b] = args.map(atomToNumber);
            if (a === null || b === null) throw new Error("Modulo requires numbers");
            return sym(String(a % b));
        });
    }

    _createUnaryBinaryOp = (name, op, identity, checkZero = false) => {
        return (...args) => {
            if (args.length === 0) return sym(String(identity));
            if (args.length === 1) {
                const num = atomToNumber(args[0]);
                if (num === null) throw new Error(`Invalid ${name} arg: ${args[0]}`);
                return sym(String(op(identity === 0 ? 0 : 1/identity, num))); // For unary: op(0, x) or op(1, x)
            }
            if (args.length >= 2) {
                const [a, b] = args.slice(0, 2).map(atomToNumber);
                if (a === null || b === null) throw new Error(`${name} requires numbers`);
                if (checkZero && b === 0) throw new Error(`${name} by zero`);
                return sym(String(op(a, b)));
            }
            throw new Error(`Invalid ${name} args: ${args}`);
        };
    }

    _registerComparisonOps() {
        const numCompare = op => (a, b) => {
            const [numA, numB] = [atomToNumber(a), atomToNumber(b)];
            if (numA === null || numB === null) throw new Error(`Non-numeric comparison: ${a}, ${b}`);
            return createBooleanAtom(op(numA, numB));
        };

        this.register('&==', (a, b) => createBooleanAtom(a?.equals ? a.equals(b) : a === b));
        this.register('&!=', (a, b) => createBooleanAtom(!(a?.equals ? a.equals(b) : a === b)));
        this.register('&<', numCompare((a, b) => a < b));
        this.register('&>', numCompare((a, b) => a > b));
        this.register('&<=', numCompare((a, b) => a <= b));
        this.register('&>=', numCompare((a, b) => a >= b));
    }

    _registerLogicalOps() {
        this.register('&and', (...args) => {
            if (args.length === 0) return createBooleanAtom(true);
            for (const arg of args) {
                if (arg?.name === 'False' || !isTruthy(arg)) return createBooleanAtom(false);
            }
            return createBooleanAtom(true);
        });

        this.register('&or', (...args) => {
            if (args.length === 0) return createBooleanAtom(false);
            for (const arg of args) {
                if (arg?.name === 'True' || isTruthy(arg)) return createBooleanAtom(true);
            }
            return createBooleanAtom(false);
        });

        this.register('&not', a => createBooleanAtom(!isTruthy(a)));
    }

    _registerListOps() {
        this.register('&first', lst => {
            if (!lst) return null;
            return lst.components?.[0] ?? lst[0] ?? null;
        });

        this.register('&rest', lst => {
            if (!lst) return sym('()');
            if (Array.isArray(lst)) return lst.slice(1);
            if (lst.components) {
                return lst.components.length > 1
                    ? exp(lst.operator, lst.components.slice(1))
                    : sym('()');
            }
            return sym('()');
        });

        this.register('&empty?', lst => {
            const isEmpty = Array.isArray(lst)
                ? lst.length === 0
                : lst?.name === '()' || (lst?.components && lst.components.length === 0);
            return createBooleanAtom(isEmpty);
        });
    }

    _registerStringOps() {
        this.register('&str-concat', (a, b) => String(a) + String(b));
        this.register('&to-string', a => String(a));
    }

    _registerIOOps() {
        this.register('&print', (...args) => {
            const output = args.map(arg => arg?.name ?? String(arg)).join(' ');
            console.log(output);
            return args.length === 1 ? args[0] : sym('Null');
        });

        this.register('&println', (...args) => {
            console.log(...args.map(arg => arg?.name ?? String(arg)));
            return null;
        });
    }

    _registerSpaceOps() {
        this.register('&add-atom', (space, atom) => {
            if (typeof space?.add !== 'function') throw new Error("Invalid space");
            space.add(atom);
            return atom;
        });

        this.register('&rm-atom', (space, atom) => {
            if (typeof space?.remove !== 'function') throw new Error("Invalid space");
            return space.remove(atom);
        });

        this.register('&get-atoms', space => {
            if (typeof space?.all !== 'function') throw new Error("Invalid space");
            return this._listify(space.all());
        });
    }

    _registerIntrospectionOps() {
        const stiMap = new Map();

        this.register('&get-sti', atom => sym(String(stiMap.get(atom.toString()) || 0)));
        this.register('&set-sti', (atom, value) => {
            const num = atomToNumber(value);
            if (num !== null) stiMap.set(atom.toString(), num);
            return value;
        });

        this.register('&system-stats', () => ({
            type: 'atom',
            name: 'Stats',
            toString: () => `(Stats :sti-count ${stiMap.size})`
        }));
    }

    _registerTypeOps() {
        // Type checking operations
        this.register('&type-infer', (term, interpreter) => {
            if (!interpreter?.typeChecker) return sym('Unknown');
            try {
                const type = interpreter.typeChecker.infer(term, {});
                return sym(interpreter.typeChecker.typeToString(type));
            } catch (e) {
                return sym('Error');
            }
        });

        this.register('&type-check', (term, expectedType, interpreter) => {
            if (!interpreter?.typeChecker) return sym('False');
            try {
                const isValid = interpreter.typeChecker.check(term, expectedType, {});
                return createBooleanAtom(isValid);
            } catch (e) {
                return createBooleanAtom(false);
            }
        });

        this.register('&type-unify', (type1, type2, interpreter) => {
            if (!interpreter?.typeChecker) return sym('None');
            try {
                const subst = interpreter.typeChecker.unify(type1, type2);
                return subst ? sym('Success') : sym('Failure');
            } catch (e) {
                return sym('Error');
            }
        });
    }

    _registerPlaceholderOps() {
        this.register('&subst', () => { throw new Error("&subst should be provided by Interpreter"); });
        this.register('&match', () => { throw new Error("&match should be provided by Interpreter"); });
        this.register('&type-of', () => { throw new Error("&type-of should be provided by Interpreter"); });
    }

    // === Helpers ===

    _listify = (arr) => {
        return arr.length === 0 ? sym('()') : exp(sym(':'), [arr[0], this._listify(arr.slice(1))]);
    }

    list() {
        return Array.from(this.operations.keys());
    }

    clear() {
        this.operations.clear();
    }
}

// === Utilities ===

const atomToNumber = atom => {
    if (atom == null) return null;
    if (typeof atom === 'number') return atom;
    if (atom.name) {
        const num = parseFloat(atom.name);
        return isNaN(num) ? null : num;
    }
    return null;
};

const createBooleanAtom = bool => sym(bool ? 'True' : 'False');

const isTruthy = value => {
    if (!value) return false;
    if (value.name) {
        if (['False', 'false', 'null', 'Nil'].includes(value.name)) return false;
        if (['True', 'true'].includes(value.name)) return true;
        const num = parseFloat(value.name);
        return !isNaN(num) ? num !== 0 : true;
    }
    return Boolean(value);
};
