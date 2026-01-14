/**
 * MeTTaInterpreter.js - Main Interpreter
 * Components wiring and standard library loading.
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { TermFactory } from '@senars/core/src/term/TermFactory.js';
import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { Parser } from './Parser.js';
import { TypeChecker, TypeSystem } from './TypeSystem.js';
import { objToBindingsAtom, bindingsAtomToObj } from './kernel/Bindings.js';
import { Ground } from './kernel/Ground.js';
import { MemoizationCache } from './kernel/MemoizationCache.js';
import { reduce, reduceND, step, match, reduceAsync, reduceNDAsync } from './kernel/Reduce.js';
import { ReactiveSpace } from './extensions/ReactiveSpace.js';
import { Space } from './kernel/Space.js';
import { Term, isList, flattenList, isExpression } from './kernel/Term.js';
import { Unify } from './kernel/Unify.js';
import { Formatter } from './kernel/Formatter.js';
import { loadStdlib } from './stdlib/StdlibLoader.js';
import { WorkerPool } from './platform/WorkerPool.js';
import { ENV } from './platform/env.js';

export class MeTTaInterpreter extends BaseMeTTaComponent {
    constructor(reasoner, options = {}) {
        // Normalize arguments: if reasoner is actually options object, swap
        if (reasoner && typeof reasoner === 'object' && !Object.keys(options).length) {
            options = reasoner;
            reasoner = null;
        }

        const opts = { maxReductionSteps: 1000, ...options };
        if (!opts.termFactory) opts.termFactory = new TermFactory();

        super(opts, 'MeTTaInterpreter', opts.eventBus, opts.termFactory);

        this.reasoner = reasoner;
        this.space = new ReactiveSpace();
        this.ground = new Ground();
        this.parser = new Parser();
        this.typeSystem = new TypeSystem();
        this.typeChecker = new TypeChecker(this.typeSystem);
        this.memoCache = new MemoizationCache(opts.cacheCapacity || 1000);

        this._initializeOperations();
        this._initializeBridge();
        this._loadStandardLibrary();
    }

    /**
     * Initialize all operation sets in proper order
     */
    _initializeOperations() {
        this.registerAdvancedOps();
        this.registerReactiveOps();
        this.registerParallelOps();
        this.registerMinimalOps();
        this.registerHofOps();
    }

    /**
     * Register bridge primitives if available
     */
    _initializeBridge() {
        const bridge = this.reasoner?.bridge || this.config.bridge;
        if (bridge?.registerPrimitives) {
            bridge.registerPrimitives(this.ground);
        }
    }



    /**
     * Load standard library if enabled
     */
    _loadStandardLibrary() {
        if (this.config.loadStdlib !== false) {
            try {
                loadStdlib(this, this.config);
            } catch (e) {
                console.warn("Stdlib load failed:", e.message);
            }
        }
    }

    /**
     * Register advanced operations that extend the core functionality
     */
    registerAdvancedOps() {
        const { sym, exp, var: v } = Term;
        const reg = (n, fn, opts) => this.ground.register(n, fn, opts);

        // Substitution operations
        reg('&subst', (a, b, c) =>
            c ? Unify.subst(c, a.name ? { [a.name]: b } : {}) : Unify.subst(a, bindingsAtomToObj(b)),
            { lazy: true }
        );

        reg('&let', (vari, val, body) =>
            Unify.subst(body, vari?.name ? { [vari.name]: val } : {}),
            { lazy: true }
        );

        // Unification operations
        reg('&unify', (pat, term) => {
            const b = Unify.unify(pat, term);
            return b ? objToBindingsAtom(b) : sym('False');
        });

        // Matching operations
        reg('&match', (s, p, t) => this._listify(match(this.space, p, t)), { lazy: true });
        reg('&query', (p, t) => this._listify(match(this.space, p, t)));

        // Type operations
        reg('&type-of', (atom) => {
            const res = match(this.space, exp(':', [atom, v('type')]), v('type'));
            return res.length ? res[0] : sym('Atom');
        });

        reg('&type-infer', (term) => {
            try {
                return sym(this.typeChecker?.typeToString(this.typeChecker.infer(term, {})) || 'Unknown');
            } catch {
                return sym('Error');
            }
        });

        reg('&type-check', (t, type) => sym(this.typeChecker ? 'True' : 'False'));

        // Context-dependent type operations
        reg('get-type', (atom, space) => {
            const s = space || this.space;
            const typePattern = exp(sym(':'), [atom, v('type')]);
            const results = match(s, typePattern, v('type'));
            return results.length ? results[0] : sym('%Undefined%');
        }, { lazy: true });

        reg('match-types', (t1, t2, thenBranch, elseBranch) => {
            // Handle %Undefined% and Atom as wildcards
            if (t1.name === '%Undefined%' || t2.name === '%Undefined%' ||
                t1.name === 'Atom' || t2.name === 'Atom') {
                return thenBranch;
            }
            const bindings = Unify.unify(t1, t2);
            return bindings !== null ? thenBranch : elseBranch;
        }, { lazy: true });

        reg('assert-type', (atom, expectedType, space) => {
            const s = space || this.space;
            const actualType = this.ground.execute('&get-type', atom, s);

            // No type info = pass through
            if (actualType.name === '%Undefined%') return atom;

            // Unify actual and expected types
            const bindings = Unify.unify(actualType, expectedType);
            if (bindings !== null) return atom;

            // Type mismatch - return error
            return exp(sym('Error'), [
                atom,
                exp(sym('TypeError'), [expectedType, actualType])
            ]);
        }, { lazy: true });

        // Space operations
        reg('&get-atoms', () => this._listify(this.space.all()));
        reg('&add-atom', (atom) => { this.space.add(atom); return atom; });
        reg('&rm-atom', (atom) => { this.space.remove(atom); return atom; });

        // I/O operations
        reg('&println', (...args) => {
            console.log(...args.map(a => Formatter.toHyperonString(a)));
            return sym('()');
        });

        // List operations
        reg('&length', (list) => sym(isList(list) ? flattenList(list).elements.length.toString() : '0'));

        // Control flow operations
        reg('&if', (cond, thenB, elseB) => {
            const res = reduce(cond, this.space, this.ground);
            if (res.name === 'True') return reduce(thenB, this.space, this.ground);
            if (res.name === 'False') return reduce(elseB, this.space, this.ground);
            return exp('if', [res, thenB, elseB]);
        }, { lazy: true });

        reg('&let*', (binds, body) => this._handleLetStar(binds, body), { lazy: true });

        // Higher-order function operations
        reg('&map-fast', (fn, list) =>
            this._listify(this._flattenToList(list).map(el =>
                reduce(exp(fn, [el]), this.space, this.ground)
            )),
            { lazy: true }
        );

        reg('&filter-fast', (pred, list) =>
            this._listify(this._flattenToList(list).filter(el =>
                this._truthy(reduce(exp(pred, [el]), this.space, this.ground))
            )),
            { lazy: true }
        );

        reg('&foldl-fast', (fn, init, list) =>
            this._flattenToList(list).reduce((acc, el) =>
                reduce(exp(fn, [acc, el]), this.space, this.ground),
                init
            ),
            { lazy: true }
        );
    }

    /**
     * Register reactive operations
     */
    registerReactiveOps() {
        const { sym, exp } = Term;
        const reg = (n, fn, opts) => this.ground.register(n, fn, opts);

        reg('&get-event-log', (sinceAtom) => {
            const since = sinceAtom ? (parseInt(sinceAtom.name) || 0) : 0;
            const log = this.space.getEventLog?.(since) || [];

            return this._listify(log.map(e => {
                let dataAtom = e.data;
                if (e.event === 'addRule') {
                    // Convert rule object to (= pattern result)
                    dataAtom = exp(sym('='), [e.data.pattern, e.data.result]);
                }

                return exp(sym('Event'), [
                    sym(e.event),
                    dataAtom,
                    sym(String(e.timestamp))
                ]);
            }));
        }, { lazy: true });

        reg('&clear-event-log', () => {
            this.space.clearEventLog?.();
            return sym('()');
        });
    }

    /**
     * Register parallel evaluation operations
     */
    registerParallelOps() {
        const { sym, exp } = Term;
        const reg = (n, fn, opts) => this.ground.register(n, fn, opts);

        reg('&map-parallel', async (listRaw, vari, templ) => {
            let list = listRaw;
            if (listRaw) {
                const evalRes = await this.evaluateAsync(listRaw);
                if (evalRes && evalRes.length > 0) list = evalRes[0];
            }

            const items = this._flattenToList(list);
            if (!this.workerPool) {
                this.workerPool = new WorkerPool(
                    this.config.workerScript || (ENV.isNode ?
                        (new URL('./platform/node/metta-worker.js', import.meta.url).pathname) :
                        '/metta-worker.js'),
                    this.config.workerPoolSize || 4
                );
            }

            const results = await this.workerPool.mapParallel(items, item => {
                const subst = Unify.subst(templ, { [vari.name]: item });
                return { code: `!${subst.toString()}` };
            });

            return this._listify(results.map(r => {
                const parsed = this.parser.parse(r);
                return parsed || sym('()');
            }));
        }, { lazy: true });
    }

    /**
     * Register higher-order function operations with interpreter awareness
     */
    registerHofOps() {
        const { sym, exp, isExpression } = Term;
        const reg = (n, fn, opts) => this.ground.register(n, fn, opts);

        // Override HOF operations with interpreter-aware versions
        reg('map-atom-fast', (list, varName, transformFn) => {
            const elements = this.ground._flattenExpr(list);
            const mapped = elements.map(el => reduce(
                Unify.subst(transformFn, { [varName.name]: el }),
                this.space,
                this.ground,
                this.config.maxReductionSteps,
                this.memoCache
            ));
            return this.ground._listify(mapped);
        }, { lazy: true });

        reg('filter-atom-fast', (list, varName, predFn) => {
            const elements = this.ground._flattenExpr(list);
            const filtered = elements.filter(el =>
                this.ground._truthy(reduce(
                    Unify.subst(predFn, { [varName.name]: el }),
                    this.space,
                    this.ground,
                    this.config.maxReductionSteps,
                    this.memoCache
                ))
            );
            return this.ground._listify(filtered);
        }, { lazy: true });

        reg('foldl-atom-fast', (list, init, aVar, bVar, opFn) => {
            const elements = this.ground._flattenExpr(list);
            return elements.reduce((acc, el) => {
                const substituted = Unify.subst(Unify.subst(opFn, { [aVar.name]: acc }), { [bVar.name]: el });
                return reduce(substituted, this.space, this.ground, this.config.maxReductionSteps, this.memoCache);
            }, init);
        }, { lazy: true });
    }

    /**
     * Register minimal core operations
     */
    registerMinimalOps() {
        const { sym, exp, isExpression } = Term;
        const reg = (n, fn, opts) => this.ground.register(n, fn, opts);

        reg('eval', (atom) =>
            step(atom, this.space, this.ground, this.config.maxReductionSteps, this.memoCache).reduced,
            { lazy: true }
        );

        reg('chain', (atom, vari, templ) => {
            const res = reduce(atom, this.space, this.ground, this.config.maxReductionSteps, this.memoCache);
            return (res.name === 'Empty' || (isExpression(res) && res.operator?.name === 'Error'))
                ? res
                : Unify.subst(templ, { [vari.name]: res });
        }, { lazy: true });

        reg('unify', (atom, pat, thenB, elseB) => {
            const b = Unify.unify(atom, pat);
            return b ? Unify.subst(thenB, b) : elseB;
        }, { lazy: true });

        reg('function', (body) => {
            let curr = body;
            const limit = this.config.maxReductionSteps || 1000;

            for (let i = 0; i < limit; i++) {
                const res = step(curr, this.space, this.ground, limit, this.memoCache);
                const red = res.reduced;

                if (isExpression(red) && red.operator?.name === 'return') {
                    return red.components[0] || sym('()');
                }

                if (red === curr || red.equals?.(curr)) break;
                if (!res.applied) break;

                curr = red;
            }

            return exp(sym('Error'), [body, sym('NoReturn')]);
        }, { lazy: true });

        reg('return', (val) => exp(sym('return'), [val]), { lazy: true });

        reg('collapse-bind', (atom) =>
            this._listify(reduceND(atom, this.space, this.ground, this.config.maxReductionSteps)),
            { lazy: true }
        );

        reg('superpose-bind', (collapsed) => {
            const items = this._flattenToList(collapsed);
            return items.length === 1 ? items[0] : exp(sym('superpose'), items);
        });

        reg('context-space', () => this.space, { lazy: true });
        reg('noeval', (atom) => atom, { lazy: true });
    }

    /**
     * Convert array to list representation
     */
    _listify(arr) {
        return arr.length
            ? Term.exp(':', [arr[0], this._listify(arr.slice(1))])
            : Term.sym('()');
    }

    /**
     * Handle let* sequential bindings
     */
    _handleLetStar(bindings, body) {
        const { flattenList, sym, exp } = Term;

        // Extract pairs based on binding structure
        const pairs = bindings.operator?.name === ':'
            ? flattenList(bindings).elements
            : bindings.type === 'compound'
                ? [bindings.operator, ...bindings.components]
                : bindings.name !== '()'
                    ? (console.error('Invalid &let* bindings', bindings), [])
                    : [];

        if (!pairs.length) return reduce(body, this.space, this.ground);

        const [first, ...rest] = pairs;
        if (!first?.components?.length) return body;

        // Extract variable and value
        const [v, val] = first.operator?.name === ':'
            ? first.components
            : [first.operator, first.components[0]];

        if (!v || !val) return body;

        const inner = rest.length
            ? exp(sym('let*'), [exp(rest[0], rest.slice(1)), body])
            : body;

        return reduce(exp(sym('let'), [v, val, inner]), this.space, this.ground);
    }

    /**
     * Flatten list structure to array
     */
    _flattenToList(atom) {
        if (!atom || atom.name === '()') return [];
        if (isList(atom)) return flattenList(atom).elements;
        // Fallback for non-list compounds (legacy/specific behavior)
        if (isExpression(atom)) return [atom.operator, ...atom.components];
        return [atom];
    }

    /**
     * Determine truthiness of an atom
     */
    _truthy(atom) {
        return atom && !['False', '()', 'Empty'].includes(atom.name);
    }

    /**
     * Execute a program string
     */
    run(code) {
        return this.trackOperation('run', () => {
            const exprs = this.parser.parseProgram(code);
            const res = [];

            for (let i = 0; i < exprs.length; i++) {
                const e = exprs[i];

                if (e.name === '!' && i + 1 < exprs.length) {
                    const evalRes = this.evaluate(exprs[++i]);
                    if (Array.isArray(evalRes)) res.push(...evalRes);
                    else res.push(evalRes);
                    continue;
                }

                this._processExpression(e, res);
            }

            res.toString = () => Formatter.formatResult(res);
            return res;
        });
    }

    /**
     * Load code into the space without evaluating
     */
    load(code) {
        return this.parser.parseProgram(code).map(e => {
            this._processExpression(e, null);
            return { term: e };
        });
    }

    /**
     * Process a single expression (add rule or evaluate)
     */
    _processExpression(expr, results) {
        if ((expr.operator === '=' || expr.operator?.name === '=') && expr.components?.length === 2) {
            this.space.addRule(expr.components[0], expr.components[1]);
            if (results) results.push(expr);
        } else {
            if (results) {
                const evalRes = this.evaluate(expr);
                if (Array.isArray(evalRes)) {
                    results.push(...evalRes);
                    evalRes.forEach(r => this.space.add(r));
                } else {
                    results.push(evalRes);
                    this.space.add(evalRes);
                }
            } else {
                this.space.add(expr);
            }
        }
    }

    /**
     * Evaluate an atom with non-deterministic reduction
     */
    evaluate(atom) {
        return this.trackOperation('evaluate', () => {
            const res = reduceND(atom, this.space, this.ground, this.config.maxReductionSteps);
            const steps = this._mettaMetrics.get('reductionSteps') || 0;
            this._mettaMetrics.set('reductionSteps', steps + 1);
            return res;
        });
    }

    /**
     * Perform a single reduction step
     */
    step(atom) {
        return step(atom, this.space, this.ground, this.config.maxReductionSteps, this.memoCache);
    }

    /**
     * Query the space for matching patterns
     */
    query(pattern, template) {
        const p = typeof pattern === 'string' ? this.parser.parse(pattern) : pattern;
        const t = typeof template === 'string' ? this.parser.parse(template) : template;
        const res = match(this.space, p, t);
        res.toString = () => Formatter.formatResult(res);
        return res;
    }

    /**
     * Get interpreter statistics
     */
    getStats() {
        return {
            space: this.space.getStats(),
            groundedAtoms: { count: this.ground.getOperations().length },
            reductionEngine: { maxSteps: this.config.maxReductionSteps || 10000 },
            typeSystem: {
                count: this.typeSystem ? 1 : 0,
                typeVariables: this.typeSystem?.nextTypeVarId || 0
            },
            groundOps: this.ground.getOperations().length,
            ...super.getStats()
        };
    }

    /**
     * Run code asynchronously
     */
    async runAsync(code) {
        return this.trackOperation('run', async () => {
            const exprs = this.parser.parseProgram(code);
            const res = [];

            for (let i = 0; i < exprs.length; i++) {
                const e = exprs[i];
                if (e.name === '!' && i + 1 < exprs.length) {
                    const evalRes = await this.evaluateAsync(exprs[++i]);
                    if (Array.isArray(evalRes)) res.push(...evalRes);
                    else res.push(evalRes);
                    continue;
                }

                if ((e.operator === '=' || e.operator?.name === '=') && e.components?.length === 2) {
                    this.space.addRule(e.components[0], e.components[1]);
                } else {
                    this.space.add(e);
                }
            }
            res.toString = () => Formatter.formatResult(res);
            return res;
        });
    }

    /**
     * Evaluate asynchronously
     */
    async evaluateAsync(atom) {
        return this.trackOperation('evaluate', async () => {
            const res = await reduceNDAsync(atom, this.space, this.ground, this.config.maxReductionSteps);
            const steps = this._mettaMetrics.get('reductionSteps') || 0;
            this._mettaMetrics.set('reductionSteps', steps + 1);
            return res;
        });
    }
}
