/**
 * MeTTaInterpreter.js - Main MeTTa interpreter
 * Wires kernel components and loads standard library
 */

import { Space } from './kernel/Space.js';
import { Ground } from './kernel/Ground.js';
import { step, reduce, match } from './kernel/Reduce.js';
import { Parser } from './Parser.js';
import { Unify } from './kernel/Unify.js';
import { Term } from './kernel/Term.js';
import { objToBindingsAtom, bindingsAtomToObj } from './kernel/Bindings.js';
import { loadStdlib } from './stdlib/StdlibLoader.js';
import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';

export class MeTTaInterpreter extends BaseMeTTaComponent {
    constructor(reasoner, options = {}) {
        // Support both constructor(options) and constructor(reasoner, options)
        if (reasoner && typeof reasoner === 'object' && Object.keys(options).length === 0) {
            options = reasoner;
            reasoner = null;
        }

        const actualOptions = options || {};
        super(actualOptions, 'MeTTaInterpreter', actualOptions.eventBus, actualOptions.termFactory);

        // this.termFactory is set by super

        this.reasoner = reasoner;
        // this.termFactory is set by super

        this.space = new Space();
        this.ground = new Ground();
        this.parser = new Parser();

        // Register advanced grounded operations
        this.registerAdvancedOps();

        // Load standard library (unless disabled)
        if (this.config.loadStdlib !== false) {
            try {
                loadStdlib(this, this.config);
            } catch (e) {
                console.warn("Failed to load standard library:", e.message);
            }
        }
    }

    registerAdvancedOps() {
        const { sym } = Term;

        this.ground.register('&subst', (a, b, c) => {
            // Case 1: (subst variable value template) - used by let/lambda
            if (c !== undefined) {
                const variable = a;
                const value = b;
                const template = c;
                const bindings = {};
                if (variable.name) {
                    bindings[variable.name] = value;
                }
                return Unify.subst(template, bindings);
            }
            // Case 2: (subst template bindings) - used by match
            else {
                const template = a;
                const bindingsAtom = b;
                // Convert bindings atom back to object
                const bindings = bindingsAtomToObj(bindingsAtom);
                return Unify.subst(template, bindings);
            }
        }, { lazy: true });

        // &let: Let (variable, value, body) -> result
        this.ground.register('&let', (variable, value, body) => {
            const bindings = {};
            if (variable.name) {
                bindings[variable.name] = value;
            } else {
                // console.error(`[DEBUG] &let variable has no name:`, variable);
            }
            const result = Unify.subst(body, bindings);
            return result;
        }, { lazy: true });

        // &unify: Unify (pattern, term) -> bindings or False
        this.ground.register('&unify', (pattern, term) => {
            const bindings = Unify.unify(pattern, term);
            if (bindings === null) {
                return Term.sym('False');
            }
            return objToBindingsAtom(bindings);
        });

        // &match: Match (space, pattern, template)
        this.ground.register('&match', (space, pattern, template) => {
            // If space is &self, use this.space
            // TODO: handle other spaces passed as arguments
            let targetSpace = this.space;

            // If space argument is provided and looks like a space (has query method), use it?
            // For now, we only support implicit &self or ignoring the first arg if it denotes self

            const results = match(targetSpace, pattern, template);

            // Listify results
            const listify = (arr) => {
                if (arr.length === 0) return Term.sym('()');
                return Term.exp(':', [arr[0], listify(arr.slice(1))]);
            };
            return listify(results);
        }, { lazy: true });

        // &query: Query (pattern, template) -> results
        this.ground.register('&query', (pattern, template) => {
            const results = match(this.space, pattern, template);
            const listify = (arr) => {
                if (arr.length === 0) return Term.sym('()');
                return Term.exp(':', [arr[0], listify(arr.slice(1))]);
            };
            return listify(results);
        });

        // &type-of: Get type
        this.ground.register('&type-of', (atom) => {
            // Search for (: atom $type)
            const pattern = Term.exp(':', [atom, Term.var('type')]);
            const template = Term.var('type');
            const results = match(this.space, pattern, template);
            if (results.length > 0) return results[0];
            return Term.sym('Atom'); // Default type
        });

        // &get-atoms: Get all atoms from space
        this.ground.register('&get-atoms', (spaceAtom) => {
            // Assume spaceAtom is &self for now, or resolve it
            // TODO: Support multiple spaces
            const atoms = this.space.all();

            // Convert JS array to MeTTa list (: h (: t ...))
            const listify = (arr) => {
                if (arr.length === 0) return Term.sym('()');
                return Term.exp(':', [arr[0], listify(arr.slice(1))]);
            };
            return listify(atoms);
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
            if (!list || !list.components) return Term.sym('0');
            // Assuming cons list (: h t)
            const { flattenList, isList } = Term;
            if (isList(list)) {
                return Term.sym(flattenList(list).elements.length.toString());
            }
            return Term.sym('0');
        });

        // &if: Conditional (lazy)
        this.ground.register('&if', (cond, thenBranch, elseBranch) => {
            // Reduce condition first
            const reducedCond = reduce(cond, this.space, this.ground);

            // Check if condition reduced to True/False
            if (reducedCond.name === 'True') {
                return reduce(thenBranch, this.space, this.ground);
            } else if (reducedCond.name === 'False') {
                return reduce(elseBranch, this.space, this.ground);
            }
            // Could not decide, return original (reconstructed) or partially reduced
            // We return expression (if reducedCond then else)
            // This allows it to be reduced later if variables are bound
            return Term.exp('if', [reducedCond, thenBranch, elseBranch]);
        }, { lazy: true });

        // &let*: Sequential binding (let* ((var val) ...) body)
        this.ground.register('&let*', (bindings, body) => {
            // Expect bindings to be a list (Expression or Cons)
            // We'll handle Expression list ((v1 val1) (v2 val2))

            const { isList, flattenList } = Term;
            let pairs = [];

            if (bindings.operator && bindings.operator.name === ':') {
                // Cons list
                pairs = flattenList(bindings).elements;
            } else if (bindings.type === 'compound') { // isExpression
                // Expression list: treat operator as first element!
                pairs = [bindings.operator, ...bindings.components];
            } else if (bindings.name === '()') {
                pairs = [];
            } else {
                // Empty or invalid
                console.error('[DEBUG] &let* invalid bindings', bindings);
                return body;
            }

            if (pairs.length === 0) {
                return reduce(body, this.space, this.ground);
            }

            // Expand to nested let
            // (let* (p1 p2 ...) body) -> (let v1 val1 (let* (p2 ...) body))
            const firstPair = pairs[0];
            const restPairs = pairs.slice(1);

            // Extract var and val from firstPair
            // firstPair should be (var val)
            let variable, value;

            if (firstPair.components && firstPair.components.length > 0) {
                // Warning: In expression logic, operator might be the variable if list is (var val) and treated as op=var
                // Or if it used : operator

                if (firstPair.operator && firstPair.operator.name === ':') {
                    variable = firstPair.components[0];
                    value = firstPair.components[1];
                } else {
                    // Expression case: (var val)
                    // If parsed as expression, operator is var, arg is val.
                    // Parser.parse('(x 1)') -> exp(x, [1])
                    variable = firstPair.operator;
                    value = firstPair.components[0];
                }

                // Fallback/Validation
                if (!variable || !value) {
                    return body; // Fail gracefully
                }
            } else {
                return reduce(body, this.space, this.ground);
            }

            // Recursive let* term
            let recursiveLetStar;
            if (restPairs.length === 0) {
                recursiveLetStar = body;
            } else {
                // Construct rest bindings expression
                // We must match the structure expected by our parsing logic:
                // pairs = [bindings.operator, ...bindings.components]
                // So we construct exp(first_pair, [rest_pairs])
                const nextFirst = restPairs[0];
                const nextRest = restPairs.slice(1);

                // Note: Term.exp handles object operators fine
                const restBindings = Term.exp(nextFirst, nextRest);

                recursiveLetStar = Term.exp(sym('let*'), [restBindings, body]);
            }

            const letTerm = Term.exp(sym('let'), [variable, value, recursiveLetStar]);
            return reduce(letTerm, this.space, this.ground);

        }, { lazy: true });
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
                        const toEval = expressions[++i];
                        results.push(this.evaluate(toEval));
                    }
                    continue;
                }

                // Check if it's a rule definition BEFORE evaluation
                // Handle both string operator (legacy) and atom operator (new parser)
                const isRule = (expr.operator === '=' || (expr.operator && expr.operator.name === '=')) &&
                    expr.components && expr.components.length === 2;

                if (isRule) {
                    // Add as rule without evaluation
                    this.space.addRule(expr.components[0], expr.components[1]);
                    // Return the original expression as result for compatibility
                    results.push(expr);
                } else {
                    // Evaluate non-rule expressions
                    const result = this.evaluate(expr);
                    results.push(result);
                    // Add the evaluated result to space
                    this.space.add(result);
                }
            }

            return results;
        });
    }

    /**
     * Evaluate a single expression
     * @param {Object} expr - Expression to evaluate
     * @returns {*} Result of evaluation
     */
    evaluate(expr) {
        return this.trackOperation('evaluate', () => {
            const limit = this.config.maxReductionSteps || 2000000;
            return reduce(expr, this.space, this.ground, limit);
        });
    }

    /**
     * Load MeTTa code without evaluating
     * @param {string} code - MeTTa source code
     */
    load(code) {
        const expressions = this.parser.parseProgram(code);

        for (const expr of expressions) {
            // Check if it's a rule definition (= pattern result)
            // Handle both string operator (legacy) and atom operator (new parser)
            const isRule = (expr.operator === '=' || (expr.operator && expr.operator.name === '=')) &&
                expr.components && expr.components.length === 2;

            if (isRule) {
                this.space.addRule(expr.components[0], expr.components[1]);
            } else {
                this.space.add(expr);
            }
        }
        // Return expressions for compatibility with some tests expecting loaded items
        return expressions.map(e => ({ term: e }));
    }

    /**
     * Query the space with a pattern
     * @param {string|Object} pattern - Pattern to match
     * @param {string|Object} template - Template to instantiate
     * @returns {Array} Matched results
     */
    query(pattern, template) {
        if (typeof pattern === 'string') {
            pattern = this.parser.parse(pattern);
        }

        if (typeof template === 'string') {
            template = this.parser.parse(template);
        }

        return match(this.space, pattern, template);
    }

    /**
     * Get interpreter statistics
     * @returns {Object} Statistics about the interpreter
     */
    getStats() {
        return {
            space: this.space.getStats(),
            groundedAtoms: {
                count: this.ground.getOperations().length
            },
            reductionEngine: {
                maxSteps: this.config.maxReductionSteps || 10000
            },
            typeSystem: {
                count: 0 // Placeholder
            },
            macroExpander: {
                count: 0 // Placeholder
            },
            stateManager: {
                count: 0 // Placeholder
            },
            groundOps: this.ground.getOperations().length,
            ...super.getStats()
        };
    }
}
