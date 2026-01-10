import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { ReductionError } from './helpers/MeTTaHelpers.js';

export class ReductionEngine extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null, matchEngine = null) {
        super(config, 'ReductionEngine', eventBus, termFactory);
        console.log("ReductionEngine: Constructor initialized");
        this.matchEngine = matchEngine;
        this.maxSteps = config.maxReductionSteps ?? 1000;
    }

    reduceStep(expr, space) {
        if (expr.toString().includes('+,') || expr.toString().includes('+ ')) {
            console.log("ReduceStep Has Plus:", expr.toString());
            console.log("Op:", expr.operator);
            if (expr.components && expr.components.length > 0) {
                console.log("Comp0:", expr.components[0].toString());
                console.log("Comp0 Name:", expr.components[0].name);
                console.log("Comp0 Name === +:", expr.components[0].name === '+');
            }
        }
        return this.trackOperation('reduceStep', () => {
            const rules = space?.getRules?.() ?? [];
            for (const { pattern, result } of rules) {
                // console.log("Try Rule:", pattern.toString());
                const bindings = this.matchEngine?.unify(pattern, expr);
                if (expr.components?.[0]?.name === '+') {
                    console.log(`[DEBUG] Trying Rule for +: ${pattern.toString()} vs ${expr.toString()} -> Bindings:`, bindings);
                }
                if (!bindings) continue;

                // console.log("Match Success:", pattern.toString());

                const reduced = typeof result === 'function' ? result(bindings) : this.matchEngine.substitute(result, bindings);
                if (expr.components?.[0]?.name === '+') {
                    console.log(`[DEBUG] Rule Result for +:`, reduced);
                }
                if (reduced === null || reduced === undefined) continue;

                this.emitMeTTaEvent('reduced', { original: expr.toString(), reduced: reduced.toString() });
                console.error("[DEBUG] Reduced by Rule:", pattern.toString(), "MATCHES", expr.toString(), "->", reduced.toString());
                return { reduced, applied: true };
            }

            if (this._isGroundedCall(expr, space)) return this._evalGroundedSafely(expr, space);
            if (this._isLambdaApplication(expr)) return this._evalLambda(expr, space);

            // Recursive Argument Reduction
            if (expr.operator === '^' && expr.components.length === 2) {
                const head = expr.components[0];
                const argsTerm = expr.components[1];

                if (argsTerm.operator === '*' && Array.isArray(argsTerm.components)) {
                    const opName = head.name;
                    const args = argsTerm.components;
                    const newArgs = [...args];
                    let argsChanged = false;

                    if (opName === 'if') {
                        // Lazy IF: Only reduce condition (index 0)
                        if (args.length > 0) {
                            const reducedCond = this.reduce(args[0], space);
                            if (reducedCond.toString() !== args[0].toString()) {
                                newArgs[0] = reducedCond;
                                argsChanged = true;
                            }
                        }
                    }
                    else if (['let', 'let*', 'quote', 'match', 'case', 'λ', 'lambda'].includes(opName)) {
                        // Lazy forms: Do not reduce arguments
                    }
                    else {
                        // Eager Functions: Reduce all arguments
                        for (let i = 0; i < args.length; i++) {
                            const reducedArg = this.reduce(args[i], space);
                            console.log(`[DEBUG] RecArgs[${i}]: Arg=${args[i].name || args[i].operator} Reduced=${reducedArg.name || reducedArg.operator} Changed=${reducedArg.toString() !== args[i].toString()}`);
                            if (reducedArg.toString() !== args[i].toString()) {
                                newArgs[i] = reducedArg;
                                argsChanged = true;
                            }
                        }
                    }

                    if (argsChanged) {
                        try {
                            // Reconstruct term using TermFactory to ensure correct naming/caching
                            // const newArgsTerm = new argsTerm.constructor(argsTerm.type, argsTerm.name, newArgs, argsTerm.operator); // BUG: Recycled name!
                            const newArgsTerm = this.termFactory.create(argsTerm.operator, newArgs);

                            // const newExpr = new expr.constructor(expr.type, expr.name, [head, newArgsTerm], expr.operator); // BUG: Recycled name!
                            const newExpr = this.termFactory.create(expr.operator, [head, newArgsTerm]);

                            console.error("[DEBUG] Args Reduced:", expr.toString(), "->", newExpr.toString());
                            return { reduced: newExpr, applied: true };
                        } catch (e) {
                            console.error("Error reconstructing term:", e);
                        }
                    }
                }
            }

            return { reduced: expr, applied: false };
        });
    }

    reduce(expr, space) {
        return this.trackOperation('reduce', () => {
            let current = expr;
            let steps = 0;

            while (steps < this.maxSteps) {
                const { reduced, applied } = this.reduceStep(current, space);
                if (!applied) break;
                current = reduced;
                steps++;
            }

            if (steps >= this.maxSteps) {
                this.logWarn('Max reduction steps reached', { expr: expr.toString(), steps });
                throw new ReductionError('Max reduction steps exceeded', expr);
            }

            this.emitMeTTaEvent('reduction-complete', { steps });
            return current;
        });
    }

    _isGroundedCall(expr, space) {
        if (expr?.operator !== '^' || !expr.components?.[0]) return false;
        const name = expr.components[0].name;
        // Check if name is registered in GroundedAtoms (via space)
        // Also support &name convention usage
        return (space?.groundedAtoms && space.groundedAtoms.has(name)) || name?.startsWith('&');
    }

    _evalGroundedSafely(expr, space) {
        try {
            if (!space?.groundedAtoms) throw new ReductionError('No grounded atoms available', expr);
            const name = expr.components[0].name;
            const args = expr.components[1]?.components ?? [];
            const reduced = space.groundedAtoms.execute(name, ...args);
            return { reduced, applied: true };
        } catch (error) {
            this.logError('Grounded atom evaluation failed', { expr: expr.toString(), error: error.message });
            throw error;
        }
    }

    _isLambdaApplication(expr) {
        if (expr.toString().includes('λ')) {
            console.log("Check Lambda:", expr.toString());
            if (expr.components) {
                const head = expr.components[0];
                console.log("Head:", head?.toString(), "Op:", head?.operator, "Comp0:", head?.components?.[0]?.name);
            }
        }

        const isApp = expr?.operator === '^' && expr.components?.[0]?.operator === '^' && expr.components[0].components?.[0]?.name === 'λ';
        if (isApp) console.log("IsLambda: TRUE");
        return isApp;
    }

    _evalLambda(expr, space) {
        try {
            console.log("Eval Lambda:", expr.toString());
            const lambda = expr.components[0];
            const argsProduct = expr.components[1];

            const paramsProduct = lambda.components[1];
            if (!paramsProduct || !paramsProduct.components) {
                console.log("Lambda param structure invalid");
                return { reduced: expr, applied: false };
            }

            let param = paramsProduct.components[0];
            const body = paramsProduct.components[1];

            let arg = argsProduct.components[0];

            // Eagerly reduce argument before binding
            try {
                if (space) {
                    const reducedArg = this.reduce(arg, space);
                    if (reducedArg) arg = reducedArg;
                }
            } catch (e) {
                // Ignore reduction errors
            }

            // Handle List Parameters (Cons: -->)
            // Case 1: (lambda (: x ()) body) arg -> Bind x=arg
            if (param.operator === '-->' && param.components?.length === 2) {
                const head = param.components[0];
                const tail = param.components[1];

                // Check if tail is empty list ()
                if (tail.isAtomic && tail.name === '()') {
                    // Unwrap: use head as the parameter
                    param = head;
                }
                // Case 2 (Currying) omitted for simplicity; can be added later if needed
            }

            console.log("Lambda Binding:", param.name, "->", arg.toString());

            const bindings = { [param.name]: arg };
            const reduced = this.matchEngine.substitute(body, bindings);

            this.emitMeTTaEvent('reduced', { original: expr.toString(), reduced: reduced.toString() });
            return { reduced, applied: true };
        } catch (e) {
            console.error("Lambda Eval Error:", e);
            return { reduced: expr, applied: false };
        }
    }
}
