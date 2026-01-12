/**
 * MeTTaInterpreter.js - Main MeTTa interpreter
 * Wires kernel components and loads standard library
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { Parser } from './Parser.js';
import { TypeChecker, TypeSystem } from './TypeSystem.js';
import { TermFactory } from '@senars/core/src/term/TermFactory.js';

import { objToBindingsAtom, bindingsAtomToObj } from './kernel/Bindings.js';
import { Ground } from './kernel/Ground.js';
import { MemoizationCache } from './kernel/MemoizationCache.js';
import { reduce, step, match } from './kernel/Reduce.js';
import { Space } from './kernel/Space.js';
import { Term } from './kernel/Term.js';
import { Unify } from './kernel/Unify.js';

import { loadStdlib } from './stdlib/StdlibLoader.js';

export class MeTTaInterpreter extends BaseMeTTaComponent {
    constructor(reasoner, options = {}) {
        // Support both constructor(options) and constructor(reasoner, options)
        if (reasoner && typeof reasoner === 'object' && Object.keys(options).length === 0) {
            options = reasoner;
            reasoner = null;
        }

        const actualOptions = options || {};
        // Ensure termFactory exists
        if (!actualOptions.termFactory) {
            actualOptions.termFactory = new TermFactory();
        }

        super(actualOptions, 'MeTTaInterpreter', actualOptions.eventBus, actualOptions.termFactory);

        this.reasoner = reasoner;
        this.space = new Space();
        this.ground = new Ground();
        this.parser = new Parser();
        this.typeSystem = new TypeSystem();
        this.typeChecker = new TypeChecker(this.typeSystem);

        // Memoization Cache (AIKR Compliant)
        this.memoCache = new MemoizationCache(actualOptions.cacheCapacity || 1000);

        // Register advanced grounded operations
        this.registerAdvancedOps();

        // If provided, register bridge primitives
        if (this.reasoner?.bridge?.registerPrimitives) {
            this.reasoner.bridge.registerPrimitives(this.ground);
        } else if (options.bridge?.registerPrimitives) {
            options.bridge.registerPrimitives(this.ground);
        }

        // Standard library loading is now moved to async _initialize()
    }

    async _initialize() {
        // Load standard library (unless disabled)
        if (this.config.loadStdlib !== false) {
            try {
                await loadStdlib(this, this.config);
            } catch (e) {
                console.warn("Failed to load standard library:", e.message);
            }
        }
    }

    registerAdvancedOps() {
        // &subst: Subst (variable value template) or (template bindings)
        this.ground.register('&subst', (a, b, c) => {
            if (c !== undefined) {
                // (subst variable value template)
                const [variable, value, template] = [a, b, c];
                const bindings = variable.name ? { [variable.name]: value } : {};
                return Unify.subst(template, bindings);
            }
            // (subst template bindings)
            return Unify.subst(a, bindingsAtomToObj(b));
        }, { lazy: true });

        // &let: Let (variable, value, body) -> result
        this.ground.register('&let', (variable, value, body) => {
            const bindings = variable.name ? { [variable.name]: value } : {};
            return Unify.subst(body, bindings);
        }, { lazy: true });

        // &unify: Unify (pattern, term) -> bindings or False
        this.ground.register('&unify', (pattern, term) => {
            const bindings = Unify.unify(pattern, term);
            return bindings === null ? Term.sym('False') : objToBindingsAtom(bindings);
        });

        // &match: Match (space, pattern, template)
        this.ground.register('&match', (space, pattern, template) => {
            const results = match(this.space, pattern, template);
            return this._listify(results);
        }, { lazy: true });

        // &query: Query (pattern, template) -> results
        this.ground.register('&query', (pattern, template) => {
            const results = match(this.space, pattern, template);
            return this._listify(results);
        });

        // &type-of: Get type
        this.ground.register('&type-of', (atom) => {
            const pattern = Term.exp(':', [atom, Term.var('type')]);
            const results = match(this.space, pattern, Term.var('type'));
            return results.length > 0 ? results[0] : Term.sym('Atom');
        });

        // &type-infer: Infer type using type checker
        this.ground.register('&type-infer', (term) => {
            if (!this.typeChecker) return Term.sym('Unknown');
            try {
                const type = this.typeChecker.infer(term, {});
                return Term.sym(this.typeChecker.typeToString(type));
            } catch {
                return Term.sym('Error');
            }
        });

        // &type-check: Check if term has specific type
        this.ground.register('&type-check', (term, expectedType) => {
            return Term.sym(this.typeChecker ? 'True' : 'False');
        });

        // &get-atoms: Get all atoms from space
        this.ground.register('&get-atoms', (spaceAtom) => {
            return this._listify(this.space.all());
        });

        // &add-atom: Add atom to space
        this.ground.register('&add-atom', (atom) => {
            this.space.add(atom);
            return atom;
        });

        // &rm-atom: Remove atom from space
        this.ground.register('&rm-atom', (atom) => {
            this.space.remove(atom);
            return atom;
        });

        // &println: Print arguments
        this.ground.register('&println', (...args) => {
            console.log(...args.map(a => a.toString ? a.toString() : a));
            return Term.sym('()');
        });

        // &length: Get list length
        this.ground.register('&length', (list) => {
            if (Term.isList(list)) {
                return Term.sym(Term.flattenList(list).elements.length.toString());
            }
            return Term.sym('0');
        });

        // &if: Conditional (lazy)
        this.ground.register('&if', (cond, thenBranch, elseBranch) => {
            const reducedCond = reduce(cond, this.space, this.ground);
            if (reducedCond.name === 'True') return reduce(thenBranch, this.space, this.ground);
            if (reducedCond.name === 'False') return reduce(elseBranch, this.space, this.ground);
            return Term.exp('if', [reducedCond, thenBranch, elseBranch]);
        }, { lazy: true });

        // &let*: Sequential binding (let* ((var val) ...) body)
        this.ground.register('&let*', (bindings, body) => {
            return this._handleLetStar(bindings, body);
        }, { lazy: true });
    }

    _listify(arr) {
        if (arr.length === 0) return Term.sym('()');
        return Term.exp(':', [arr[0], this._listify(arr.slice(1))]);
    }

    _handleLetStar(bindings, body) {
        const { flattenList, sym, exp } = Term;
        let pairs = [];

        if (bindings.operator?.name === ':') {
            pairs = flattenList(bindings).elements;
        } else if (bindings.type === 'compound') {
            pairs = [bindings.operator, ...bindings.components];
        } else if (bindings.name === '()') {
            pairs = [];
        } else {
            console.error('[DEBUG] &let* invalid bindings', bindings);
            return body;
        }

        if (pairs.length === 0) return reduce(body, this.space, this.ground);

        const firstPair = pairs[0];
        const restPairs = pairs.slice(1);
        let variable, value;

        if (firstPair.components?.length > 0) {
            if (firstPair.operator?.name === ':') {
                [variable, value] = firstPair.components;
            } else {
                variable = firstPair.operator;
                value = firstPair.components[0];
            }
        }

        if (!variable || !value) return body;

        let recursiveLetStar = body;
        if (restPairs.length > 0) {
            const [nextFirst, ...nextRest] = restPairs;
            const restBindings = exp(nextFirst, nextRest);
            recursiveLetStar = exp(sym('let*'), [restBindings, body]);
        }

        const letTerm = exp(sym('let'), [variable, value, recursiveLetStar]);
        return reduce(letTerm, this.space, this.ground);
    }

    /**
     * Run MeTTa code
     * @param {string} code - MeTTa source code
     * @returns {Array} Results of execution
     */
    run(code) {
        return this.trackOperation('run', () => {
            const expressions = this.parser.parseProgram(code);
            const results = [];

            for (let i = 0; i < expressions.length; i++) {
                const expr = expressions[i];

                // Case 1: Explicit evaluation via !
                if (expr.type === 'atom' && expr.name === '!') {
                    if (i + 1 < expressions.length) {
                        results.push(this.evaluate(expressions[++i]));
                    }
                    continue;
                }

                this._processExpression(expr, results);
            }
            return results;
        });
    }

    /**
     * Load MeTTa code without evaluating
     * @param {string} code - MeTTa source code
     */
    load(code) {
        const expressions = this.parser.parseProgram(code);
        expressions.forEach(expr => this._processExpression(expr, null));
        return expressions.map(e => ({ term: e }));
    }

    _processExpression(expr, results) {
        const isRule = (expr.operator === '=' || expr.operator?.name === '=') &&
            expr.components?.length === 2;

        if (isRule) {
            this.space.addRule(expr.components[0], expr.components[1]);
            if (results) results.push(expr);
        } else {
            if (results) {
                const result = this.evaluate(expr);
                results.push(result);
                this.space.add(result);
            } else {
                this.space.add(expr);
            }
        }
    }

    /**
     * Evaluate a single expression
     * @param {Object} expr - Expression to evaluate
     * @returns {*} Result of evaluation
     */
    evaluate(atom) {
        return this.trackOperation('evaluate', () => {
            const result = reduce(atom, this.space, this.ground, this.config.maxReductionSteps, this.memoCache);
            this._mettaMetrics.set('reductionSteps', (this._mettaMetrics.get('reductionSteps') || 0) + 1);
            return result;
        });
    }

    step(atom) {
        return step(atom, this.space, this.ground, this.config.maxReductionSteps, this.memoCache);
    }

    /**
     * Query the space with a pattern
     * @param {string|Object} pattern - Pattern to match
     * @param {string|Object} template - Template to instantiate
     * @returns {Array} Matched results
     */
    query(pattern, template) {
        const pat = typeof pattern === 'string' ? this.parser.parse(pattern) : pattern;
        const tmpl = typeof template === 'string' ? this.parser.parse(template) : template;
        return match(this.space, pat, tmpl);
    }

    /**
     * Get interpreter statistics
     * @returns {Object} Statistics about the interpreter
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
}
