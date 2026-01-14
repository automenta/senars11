/**
 * MeTTaInterpreter.js - Main Interpreter
 * Components wiring and standard library loading.
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { Parser } from './Parser.js';
import { TypeChecker, TypeSystem } from './TypeSystem.js';
import { TermFactory } from '@senars/core/src/term/TermFactory.js';
import { objToBindingsAtom, bindingsAtomToObj } from './kernel/Bindings.js';
import { Ground } from './kernel/Ground.js';
import { MemoizationCache } from './kernel/MemoizationCache.js';
import { reduce, reduceND, step, match } from './kernel/Reduce.js';
import { Space } from './kernel/Space.js';
import { Term } from './kernel/Term.js';
import { Unify } from './kernel/Unify.js';
import { loadStdlib } from './stdlib/StdlibLoader.js';

export class MeTTaInterpreter extends BaseMeTTaComponent {
    constructor(reasoner, options = {}) {
        if (reasoner && typeof reasoner === 'object' && !Object.keys(options).length) { options = reasoner; reasoner = null; }
        const opts = options || {};
        if (!opts.termFactory) opts.termFactory = new TermFactory();

        super(opts, 'MeTTaInterpreter', opts.eventBus, opts.termFactory);

        this.reasoner = reasoner;
        this.space = new Space();
        this.ground = new Ground();
        this.parser = new Parser();
        this.typeSystem = new TypeSystem();
        this.typeChecker = new TypeChecker(this.typeSystem);
        this.memoCache = new MemoizationCache(opts.cacheCapacity || 1000);

        this.registerAdvancedOps();
        this.registerMinimalOps();

        const bridge = this.reasoner?.bridge || opts.bridge;
        if (bridge?.registerPrimitives) bridge.registerPrimitives(this.ground);

        if (this.config.loadStdlib !== false) {
            try { loadStdlib(this, this.config); } catch (e) { console.warn("Stdlib load failed:", e.message); }
        }
    }

    registerAdvancedOps() {
        const { sym, exp, var: v, isList, flattenList } = Term;
        const reg = (n, fn, opts) => this.ground.register(n, fn, opts);

        reg('&subst', (a, b, c) => c ? Unify.subst(c, a.name ? { [a.name]: b } : {}) : Unify.subst(a, bindingsAtomToObj(b)), { lazy: true });

        reg('&let', (vari, val, body) => Unify.subst(body, vari?.name ? { [vari.name]: val } : {}), { lazy: true });

        reg('&unify', (pat, term) => {
            const b = Unify.unify(pat, term);
            return b ? objToBindingsAtom(b) : sym('False');
        });

        reg('&match', (s, p, t) => this._listify(match(this.space, p, t)), { lazy: true });
        reg('&query', (p, t) => this._listify(match(this.space, p, t)));

        reg('&type-of', (atom) => {
            const res = match(this.space, exp(':', [atom, v('type')]), v('type'));
            return res.length ? res[0] : sym('Atom');
        });

        reg('&type-infer', (term) => {
            try { return sym(this.typeChecker?.typeToString(this.typeChecker.infer(term, {})) || 'Unknown'); }
            catch { return sym('Error'); }
        });

        reg('&type-check', (t, type) => sym(this.typeChecker ? 'True' : 'False'));

        reg('&get-atoms', () => this._listify(this.space.all()));

        reg('&add-atom', (atom) => { this.space.add(atom); return atom; });
        reg('&rm-atom', (atom) => { this.space.remove(atom); return atom; });

        reg('&println', (...args) => { console.log(...args.map(a => a.toString?.() ?? a)); return sym('()'); });

        reg('&length', (list) => sym(isList(list) ? flattenList(list).elements.length.toString() : '0'));

        reg('&if', (cond, thenB, elseB) => {
            const res = reduce(cond, this.space, this.ground);
            if (res.name === 'True') return reduce(thenB, this.space, this.ground);
            if (res.name === 'False') return reduce(elseB, this.space, this.ground);
            return exp('if', [res, thenB, elseB]);
        }, { lazy: true });

        reg('&let*', (binds, body) => this._handleLetStar(binds, body), { lazy: true });

        // Higher-Order Fast
        reg('&map-fast', (fn, list) => this._listify(this._flattenList(list).map(el => reduce(exp(fn, [el]), this.space, this.ground))), { lazy: true });

        reg('&filter-fast', (pred, list) => this._listify(this._flattenList(list).filter(el => this._truthy(reduce(exp(pred, [el]), this.space, this.ground)))), { lazy: true });

        reg('&foldl-fast', (fn, init, list) => this._flattenList(list).reduce((acc, el) => reduce(exp(fn, [acc, el]), this.space, this.ground), init), { lazy: true });
    }

    registerMinimalOps() {
        const { sym, exp, isExpression } = Term;
        const reg = (n, fn, opts) => this.ground.register(n, fn, opts);

        reg('eval', (atom) => step(atom, this.space, this.ground, this.config.maxReductionSteps, this.memoCache).reduced, { lazy: true });

        reg('chain', (atom, vari, templ) => {
            const res = reduce(atom, this.space, this.ground, this.config.maxReductionSteps, this.memoCache);
            return (res.name === 'Empty' || (isExpression(res) && res.operator?.name === 'Error')) ? res : Unify.subst(templ, { [vari.name]: res });
        }, { lazy: true });

        reg('unify', (atom, pat, thenB, elseB) => {
            const b = Unify.unify(atom, pat);
            return b ? Unify.subst(thenB, b) : elseB;
        }, { lazy: true });

        reg('function', (body) => {
            let curr = body, limit = this.config.maxReductionSteps || 1000;
            for (let i = 0; i < limit; i++) {
                const res = step(curr, this.space, this.ground, limit, this.memoCache);
                const red = res.reduced;
                if (isExpression(red) && red.operator?.name === 'return') return red.components[0] || sym('()');
                if (red === curr || red.equals?.(curr)) break;
                curr = red;
                if (!res.applied) break;
            }
            return exp(sym('Error'), [body, sym('NoReturn')]);
        }, { lazy: true });

        reg('return', (val) => exp(sym('return'), [val]), { lazy: true });

        reg('collapse-bind', (atom) => this._listify(reduceND(atom, this.space, this.ground, this.config.maxReductionSteps)), { lazy: true });

        reg('superpose-bind', (collapsed) => {
            const items = this._flattenList(collapsed);
            return items.length === 1 ? items[0] : exp(sym('superpose'), items);
        });

        reg('context-space', () => this.space, { lazy: true });
        reg('noeval', (atom) => atom, { lazy: true });
    }

    _listify(arr) {
        return arr.length ? Term.exp(':', [arr[0], this._listify(arr.slice(1))]) : Term.sym('()');
    }

    _handleLetStar(bindings, body) {
        const { flattenList, sym, exp } = Term;
        let pairs = [];

        if (bindings.operator?.name === ':') pairs = flattenList(bindings).elements;
        else if (bindings.type === 'compound') pairs = [bindings.operator, ...bindings.components];
        else if (bindings.name !== '()') { console.error('Invaild &let* bindings', bindings); return body; }

        if (!pairs.length) return reduce(body, this.space, this.ground);

        const [first, ...rest] = pairs;
        let v, val;

        if (first.components?.length) {
            if (first.operator?.name === ':') [v, val] = first.components;
            else { v = first.operator; val = first.components[0]; }
        }

        if (!v || !val) return body;

        const inner = rest.length ? exp(sym('let*'), [exp(rest[0], rest.slice(1)), body]) : body;
        return reduce(exp(sym('let'), [v, val, inner]), this.space, this.ground);
    }

    _flattenList(atom) {
        if (!atom || atom.name === '()') return [];
        if (atom.operator?.name === ':') return [atom.components[0], ...this._flattenList(atom.components[1])];
        return [atom];
    }

    _truthy(atom) {
        return atom && atom.name !== 'False' && atom.name !== '()' && atom.name !== 'Empty';
    }

    run(code) {
        return this.trackOperation('run', () => {
            const exprs = this.parser.parseProgram(code);
            const res = [];
            for (let i = 0; i < exprs.length; i++) {
                const e = exprs[i];
                if (e.name === '!' && i + 1 < exprs.length) { res.push(this.evaluate(exprs[++i])); continue; }
                this._processExpression(e, res);
            }
            return res;
        });
    }

    load(code) {
        return this.parser.parseProgram(code).map(e => { this._processExpression(e, null); return { term: e }; });
    }

    _processExpression(expr, results) {
        if ((expr.operator === '=' || expr.operator?.name === '=') && expr.components?.length === 2) {
            this.space.addRule(expr.components[0], expr.components[1]);
            results?.push(expr);
        } else {
            const res = results ? this.evaluate(expr) : expr;
            if (results) results.push(res);
            this.space.add(res);
        }
    }

    evaluate(atom) {
        return this.trackOperation('evaluate', () => {
            const res = reduce(atom, this.space, this.ground, this.config.maxReductionSteps, this.memoCache);
            const steps = this._mettaMetrics.get('reductionSteps') || 0;
            this._mettaMetrics.set('reductionSteps', steps + 1);
            return res;
        });
    }

    step(atom) { return step(atom, this.space, this.ground, this.config.maxReductionSteps, this.memoCache); }

    query(pattern, template) {
        const p = typeof pattern === 'string' ? this.parser.parse(pattern) : pattern;
        const t = typeof template === 'string' ? this.parser.parse(template) : template;
        return match(this.space, p, t);
    }

    getStats() {
        return {
            space: this.space.getStats(),
            groundedAtoms: { count: this.ground.getOperations().length },
            reductionEngine: { maxSteps: this.config.maxReductionSteps || 10000 },
            typeSystem: { count: this.typeSystem ? 1 : 0, typeVariables: this.typeSystem?.nextTypeVarId || 0 },
            groundOps: this.ground.getOperations().length,
            ...super.getStats()
        };
    }
}
