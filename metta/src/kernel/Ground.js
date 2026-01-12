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
        this.operations.set(this._normalize(name), { fn, options });
        return this;
    }

    has(name) {
        return this.operations.has(this._normalize(name));
    }

    isLazy(name) {
        return !!this.operations.get(this._normalize(name))?.options?.lazy;
    }

    execute(name, ...args) {
        const norm = this._normalize(name);
        if (!this.operations.has(norm)) throw new Error(`Operation ${name} not found`);
        return this.operations.get(norm).fn(...args);
    }

    getOperations() {
        return Array.from(this.operations.keys());
    }

    list() {
        return this.getOperations();
    }

    clear() {
        this.operations.clear();
    }

    _normalize(name) {
        return name.startsWith('&') ? name : `&${name}`;
    }

    // === Registration ===

    _registerCoreOperations() {
        this._registerArithmeticOps();
        this._registerComparisonOps();
        this._registerLogicalOps();
        this._registerListOps();
        this._registerStringOps();
        this._registerIOOps();
        this._registerSpaceOps();
        this._registerIntrospectionOps();
        this._registerTypeOps();

        this.register('&now', () => sym(String(Date.now())));

        // Placeholders (overridden by Interpreter)
        ['&subst', '&match', '&type-of'].forEach(op =>
            this.register(op, () => { throw new Error(`${op} should be provided by Interpreter`); })
        );
    }

    // === Implementation Helpers ===

    _atomToNum(atom) {
        if (typeof atom === 'number') return atom;
        if (atom?.name) {
            const num = parseFloat(atom.name);
            return isNaN(num) ? null : num;
        }
        return null;
    }

    _requireNums(args, count = null) {
        if (count !== null && args.length !== count) throw new Error(`Expected ${count} args`);
        const nums = args.map(a => this._atomToNum(a));
        if (nums.some(n => n === null)) throw new Error("Expected numbers");
        return nums;
    }

    _bool(val) {
        return sym(val ? 'True' : 'False');
    }

    _truthy(val) {
        if (!val) return false;
        if (val.name) {
            if (['False', 'false', 'null', 'Nil'].includes(val.name)) return false;
            if (['True', 'true'].includes(val.name)) return true;
            const num = parseFloat(val.name);
            return !isNaN(num) ? num !== 0 : true;
        }
        return Boolean(val);
    }

    // === Operation Groups ===

    _registerArithmeticOps() {
        const reduceOp = (fn, init) => (...args) => {
            if (args.length === 0) return sym(String(init));
            const nums = this._requireNums(args);
            return sym(String(nums.reduce(fn, init === undefined ? nums.shift() : init)));
        };

        const binaryOp = (fn, checkZero = false) => (...args) => {
            const [a, b] = this._requireNums(args, 2);
            if (checkZero && b === 0) throw new Error("Division by zero");
            return sym(String(fn(a, b)));
        };

        this.register('&+', reduceOp((a, b) => a + b, 0));
        this.register('&*', reduceOp((a, b) => a * b, 1));
        this.register('&%', binaryOp((a, b) => a % b));

        // Custom logic for - and / to handle unary/binary
        this.register('&-', (...args) => {
            const nums = this._requireNums(args);
            if (nums.length === 1) return sym(String(-nums[0]));
            if (nums.length === 2) return sym(String(nums[0] - nums[1]));
            throw new Error("&- requires 1 or 2 args");
        });

        this.register('&/', (...args) => {
            const nums = this._requireNums(args);
            if (nums.length === 1) return sym(String(1 / nums[0]));
            if (nums.length === 2) {
                if (nums[1] === 0) throw new Error("Division by zero");
                return sym(String(nums[0] / nums[1]));
            }
            throw new Error("&/ requires 1 or 2 args");
        });
    }

    _registerComparisonOps() {
        const cmp = fn => (...args) => {
            const [a, b] = this._requireNums(args, 2);
            return this._bool(fn(a, b));
        };

        this.register('&<', cmp((a, b) => a < b));
        this.register('&>', cmp((a, b) => a > b));
        this.register('&<=', cmp((a, b) => a <= b));
        this.register('&>=', cmp((a, b) => a >= b));

        this.register('&==', (a, b) => this._bool(a?.equals ? a.equals(b) : a === b));
        this.register('&!=', (a, b) => this._bool(!(a?.equals ? a.equals(b) : a === b)));
    }

    _registerLogicalOps() {
        this.register('&and', (...args) => this._bool(args.every(a => this._truthy(a))));
        this.register('&or', (...args) => this._bool(args.some(a => this._truthy(a))));
        this.register('&not', a => this._bool(!this._truthy(a)));
    }

    _registerListOps() {
        this.register('&first', lst => lst?.components?.[0] ?? lst?.[0] ?? null);
        this.register('&rest', lst => {
            if (Array.isArray(lst)) return lst.slice(1);
            if (lst?.components?.length > 1) return exp(lst.operator, lst.components.slice(1));
            return sym('()');
        });
        this.register('&empty?', lst => {
            const empty = Array.isArray(lst) ? !lst.length : (lst?.name === '()' || !lst?.components?.length);
            return this._bool(empty);
        });
    }

    _registerStringOps() {
        this.register('&str-concat', (a, b) => String(a) + String(b));
        this.register('&to-string', a => String(a));
    }

    _registerIOOps() {
        this.register('&print', (...args) => {
            console.log(args.map(a => a?.name ?? String(a)).join(' '));
            return args.length === 1 ? args[0] : sym('Null');
        });
        this.register('&println', (...args) => {
            console.log(...args.map(a => a?.name ?? String(a)));
            return sym('()');
        });
    }

    _registerSpaceOps() {
        this.register('&add-atom', (s, a) => { s.add(a); return a; });
        this.register('&rm-atom', (s, a) => s.remove(a));
        this.register('&get-atoms', s => this._listify(s.all()));
    }

    _registerIntrospectionOps() {
        const sti = new Map();
        this.register('&get-sti', a => sym(String(sti.get(a.toString()) || 0)));
        this.register('&set-sti', (a, v) => {
            const n = this._atomToNum(v);
            if (n !== null) sti.set(a.toString(), n);
            return v;
        });
        this.register('&system-stats', () => ({
            type: 'atom', name: 'Stats', toString: () => `(Stats :sti-count ${sti.size})`
        }));
    }

    _registerTypeOps() {
        this.register('&type-infer', (t, i) => i?.typeChecker ? sym(i.typeChecker.typeToString(i.typeChecker.infer(t, {}))) : sym('Unknown'));
        this.register('&type-check', (t, e, i) => this._bool(i?.typeChecker?.check(t, e, {})));
        this.register('&type-unify', (t1, t2, i) => sym(i?.typeChecker?.unify(t1, t2) ? 'Success' : 'Failure'));
    }

    _listify(arr) {
        return arr.length ? exp(sym(':'), [arr[0], this._listify(arr.slice(1))]) : sym('()');
    }
}
