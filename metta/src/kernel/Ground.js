/**
 * Ground.js - Native function registry
 * Registry for grounded operations in MeTTa
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { sym, exp, isExpression, constructList } from './Term.js';

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
        this._registerBudgetOps();
        this._registerExpressionOps();
        this._registerMathOps();
        this._registerSetOps();

        this.register('&now', () => sym(String(Date.now())));

        // Placeholders (overridden by Interpreter)
        ['&subst', '&match', '&type-of'].forEach(op =>
            this.register(op, () => {
                throw new Error(`${op} should be provided by Interpreter`);
            })
        );

        // Metaprogramming operations (require interpreter context)
        this._registerMetaprogrammingOps();
    }

    _registerMetaprogrammingOps() {
        // These operations require access to the Space, provided via interpreter context
        // They will be overridden by Interpreter to provide actual space access

        this.register('&add-rule', (pattern, result, interp) => {
            if (!interp?.space) throw new Error('&add-rule requires interpreter context');
            interp.space.add(exp(sym('='), [pattern, result]));
            return sym('ok');
        });

        this.register('&remove-rule', (pattern, interp) => {
            if (!interp?.space) throw new Error('&remove-rule requires interpreter context');
            // Find and remove matching rules
            const removed = interp.space.remove(pattern);
            return sym(removed ? 'ok' : 'not-found');
        });

        this.register('&get-rules-for', (pattern, interp) => {
            if (!interp?.space) throw new Error('&get-rules-for requires interpreter context');
            // Query space for rules matching pattern
            const rules = interp.space.query(pattern) || [];
            return constructList(rules.map(r => r), sym('()'));
        });

        this.register('&list-all-rules', (interp) => {
            if (!interp?.space) throw new Error('&list-all-rules requires interpreter context');
            const allAtoms = Array.from(interp.space.atoms || []);
            const rules = allAtoms.filter(atom =>
                isExpression(atom) && atom.operator?.name === '='
            );
            return constructList(rules, sym('()'));
        });

        this.register('&rule-count', (interp) => {
            if (!interp?.space) throw new Error('&rule-count requires interpreter context');
            return sym(String(interp.space.size() || 0));
        });
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
        this.register('&add-atom', (s, a) => {
            s.add(a);
            return a;
        });
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
        // Get metatype of an atom
        this.register('&get-metatype', (atom) => {
            if (!atom) return sym('%Undefined%');
            if (atom.name?.startsWith('$')) return sym('Variable');
            if (isExpression(atom)) return sym('Expression');
            if (typeof atom.execute === 'function') return sym('Grounded');
            return sym('Symbol');
        });

        // Check if type is a function type (has -> arrow)
        this.register('&is-function', (type) => {
            if (!isExpression(type)) return sym('False');
            return this._bool(type.operator?.name === '->');
        });

        // Existing type operations
        this.register('&type-infer', (t, i) => i?.typeChecker ? sym(i.typeChecker.typeToString(i.typeChecker.infer(t, {}))) : sym('Unknown'));
        this.register('&type-check', (t, e, i) => this._bool(i?.typeChecker?.check(t, e, {})));
        this.register('&type-unify', (t1, t2, i) => sym(i?.typeChecker?.unify(t1, t2) ? 'Success' : 'Failure'));
    }

    _registerBudgetOps() {
        // Budget priority operations
        this.register('&or-priority', (p1, p2) => {
            const [a, b] = this._requireNums([p1, p2], 2);
            return sym(String(Math.max(a, b)));
        });

        this.register('&and-priority', (p1, p2) => {
            const [a, b] = this._requireNums([p1, p2], 2);
            return sym(String((a + b) / 2)); // Average for AND
        });

        this.register('&max', (a, b) => {
            const [x, y] = this._requireNums([a, b], 2);
            return sym(String(Math.max(x, y)));
        });

        this.register('&min', (a, b) => {
            const [x, y] = this._requireNums([a, b], 2);
            return sym(String(Math.min(x, y)));
        });

        // Conditional for clamping
        this.register('&if', (cond, thenVal, elseVal) =>
            this._truthy(cond) ? thenVal : elseVal
        );
    }

    _registerExpressionOps() {
        // === cons-atom: construct expression from head + tail ===
        this.register('&cons-atom', (head, tail) => {
            if (!isExpression(tail)) return exp(head, [tail]);
            const components = tail.components ? [tail.operator, ...tail.components] : [tail];
            return exp(head, components);
        });

        // === decons-atom: split expression to (head tail) ===
        this.register('&decons-atom', (expr) => {
            if (!isExpression(expr)) return exp(sym('Error'), [expr, sym('NotExpression')]);
            const head = expr.operator;
            const tail = expr.components?.length
                ? (expr.components.length === 1 ? expr.components[0] : exp(expr.components[0], expr.components.slice(1)))
                : sym('()');
            return exp(sym(':'), [head, tail]);
        });

        // === car-atom: first element ===
        this.register('&car-atom', (expr) => {
            if (!isExpression(expr)) return exp(sym('Error'), [expr, sym('NotExpression')]);
            return expr.operator || exp(sym('Error'), [expr, sym('EmptyExpression')]);
        });

        // === cdr-atom: tail elements ===
        this.register('&cdr-atom', (expr) => {
            if (!isExpression(expr) || !expr.components?.length) return sym('()');
            return expr.components.length === 1
                ? expr.components[0]
                : exp(expr.components[0], expr.components.slice(1));
        });

        // === size-atom: count elements ===
        this.register('&size-atom', (expr) => {
            if (!isExpression(expr)) return sym('1');
            return sym(String(1 + (expr.components?.length || 0)));
        });

        // === index-atom: get element by index ===
        this.register('&index-atom', (expr, idx) => {
            const i = parseInt(idx.name);
            if (isNaN(i)) return exp(sym('Error'), [idx, sym('NotANumber')]);
            if (i === 0) return expr.operator || expr;
            const comp = expr.components?.[i - 1];
            return comp || exp(sym('Error'), [idx, sym('OutOfBounds')]);
        });
    }

    _registerMathOps() {
        const toNum = (atom) => parseFloat(atom?.name) || 0;
        const toSym = (n) => sym(String(Number.isInteger(n) ? n : n.toFixed(12).replace(/\.?0+$/, '')));
        const unary = (fn) => (x) => toSym(fn(toNum(x)));
        const binary = (fn) => (a, b) => toSym(fn(toNum(a), toNum(b)));

        // Transcendental functions
        this.register('&pow-math', binary(Math.pow));
        this.register('&sqrt-math', unary(Math.sqrt));
        this.register('&abs-math', unary(Math.abs));
        this.register('&log-math', binary((base, x) => Math.log(x) / Math.log(base)));

        // Rounding functions
        this.register('&trunc-math', unary(Math.trunc));
        this.register('&ceil-math', unary(Math.ceil));
        this.register('&floor-math', unary(Math.floor));
        this.register('&round-math', unary(Math.round));

        // Trigonometry
        this.register('&sin-math', unary(Math.sin));
        this.register('&asin-math', unary(Math.asin));
        this.register('&cos-math', unary(Math.cos));
        this.register('&acos-math', unary(Math.acos));
        this.register('&tan-math', unary(Math.tan));
        this.register('&atan-math', unary(Math.atan));

        // Validation
        this.register('&isnan-math', (x) => {
            const n = parseFloat(x?.name);
            return this._bool(isNaN(n));
        });
        this.register('&isinf-math', (x) => {
            const n = parseFloat(x?.name);
            return this._bool(!isFinite(n) && !isNaN(n));
        });

        // Aggregate operations
        this.register('&min-atom', (expr) => {
            const elements = this._flattenExpr(expr);
            const nums = elements.map(e => parseFloat(e?.name)).filter(n => !isNaN(n));
            if (nums.length === 0) return exp(sym('Error'), [expr, sym('EmptyOrNonNumeric')]);
            return sym(String(Math.min(...nums)));
        });
        this.register('&max-atom', (expr) => {
            const elements = this._flattenExpr(expr);
            const nums = elements.map(e => parseFloat(e?.name)).filter(n => !isNaN(n));
            if (nums.length === 0) return exp(sym('Error'), [expr, sym('EmptyOrNonNumeric')]);
            return sym(String(Math.max(...nums)));
        });
        this.register('&sum-atom', (expr) => {
            const elements = this._flattenExpr(expr);
            const sum = elements.reduce((s, e) => s + (parseFloat(e?.name) || 0), 0);
            return sym(String(sum));
        });
    }

    _registerSetOps() {
        this.register('&unique-atom', (expr) => {
            const seen = new Set();
            const result = [];
            for (const el of this._flattenExpr(expr)) {
                const key = el.toString();
                if (!seen.has(key)) { seen.add(key); result.push(el); }
            }
            return this._listify(result);
        });

        this.register('&union-atom', (a, b) => {
            const setA = this._flattenExpr(a);
            const setB = this._flattenExpr(b);
            return this._listify([...setA, ...setB]);
        });

        this.register('&intersection-atom', (a, b) => {
            const setB = new Set(this._flattenExpr(b).map(x => x.toString()));
            return this._listify(this._flattenExpr(a).filter(x => setB.has(x.toString())));
        });

        this.register('&subtraction-atom', (a, b) => {
            const setB = new Set(this._flattenExpr(b).map(x => x.toString()));
            return this._listify(this._flattenExpr(a).filter(x => !setB.has(x.toString())));
        });

        // BEYOND PARITY
        this.register('&symmetric-diff-atom', (a, b) => {
            const setA = new Set(this._flattenExpr(a).map(x => x.toString()));
            const setB = new Set(this._flattenExpr(b).map(x => x.toString()));
            const result = [
                ...this._flattenExpr(a).filter(x => !setB.has(x.toString())),
                ...this._flattenExpr(b).filter(x => !setA.has(x.toString()))
            ];
            return this._listify(result);
        });

        this.register('&is-subset', (a, b) => {
            const setB = new Set(this._flattenExpr(b).map(x => x.toString()));
            return this._bool(this._flattenExpr(a).every(x => setB.has(x.toString())));
        });

        this.register('&set-size', (expr) => sym(String(new Set(this._flattenExpr(expr).map(x => x.toString())).size)));
    }

    _flattenExpr(expr) {
        // Early return for empty list symbol to prevent it being included in results
        if (!expr || expr.name === '()') return [];
        if (!isExpression(expr)) return [expr];

        // Special handling for list structure (: head tail)
        if (expr.operator?.name === ':') {
            const result = [];
            if (expr.components && expr.components.length > 0) {
                // Add first component (head)
                const head = expr.components[0];
                if (head && head.name !== '()') result.push(head);

                // Recursively flatten tail
                if (expr.components.length > 1) {
                    result.push(...this._flattenExpr(expr.components[1]));
                }
            }
            return result;
        }

        // For other expressions, flatten all parts
        const result = [];
        if (expr.operator) result.push(expr.operator);
        if (expr.components) {
            for (const comp of expr.components) {
                if (comp.name !== '()') {
                    result.push(...this._flattenExpr(comp));
                }
            }
        }
        return result;
    }

    _listify(arr) {
        if (!arr || arr.length === 0) return sym('()');
        return exp(sym(':'), [arr[0], this._listify(arr.slice(1))]);
    }
}
