/**
 * ReductionEngine.js - MeTTa reduction/evaluation engine
 * Reduces expressions to normal form via equality rules
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { ReductionError } from './helpers/MeTTaHelpers.js';

/**
 * ReductionEngine - Pattern matching reduction engine
 * Evaluates expressions using equality-based rewriting
 */
export class ReductionEngine extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null, matchEngine = null) {
        super(config, 'ReductionEngine', eventBus, termFactory);
        this.matchEngine = matchEngine;
        this.maxSteps = config.maxReductionSteps || 1000;
    }

    /**
     * Reduce expression one step
     * @param {Term} expr - Expression to reduce
     * @param {MeTTaSpace} space - Space for grounded atom evaluation
     * @returns {Object} - {reduced, applied}
     */
    reduceStep(expr, space) {
        return this.trackOperation('reduceStep', () => {
            // Priority 1: User defined rules from space
            const rules = space?.getRules?.() ?? [];
            for (const { pattern, result } of rules) {
                const bindings = this.matchEngine?.unify(pattern, expr);
                if (!bindings) continue;

                const reduced = typeof result === 'function'
                    ? result(bindings)
                    : this.matchEngine.substitute(result, bindings);

                this.emitMeTTaEvent('reduced', {
                    original: expr.toString(),
                    reduced: reduced.toString()
                });

                return { reduced, applied: true };
            }

            // Priority 2: Grounded atoms evaluation
            if (this._isGroundedCall(expr)) {
                return this._evalGroundedSafely(expr, space);
            }

            // No reduction applied
            return { reduced: expr, applied: false };
        });
    }

    /**
     * Reduce to normal form
     * @param {Term} expr - Expression to reduce
     * @param {MeTTaSpace} space - Space for grounded atoms
     * @returns {Term} - Reduced term
     */
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

    /**
     * Check if expression is grounded atom call
     * @param {Term} expr - Expression
     * @returns {boolean}
     * @private
     */
    _isGroundedCall(expr) {
        // Safe access to components using optional chaining
        return expr?.operator === '^' &&
            expr.components?.[0]?.name?.startsWith('&');
    }

    /**
     * Evaluate grounded atom with error handling
     * @param {Term} expr - Grounded atom expression
     * @param {MeTTaSpace} space - Space with grounded atoms
     * @returns {Object} - {reduced, applied}
     * @private
     */
    _evalGroundedSafely(expr, space) {
        try {
            if (!space?.groundedAtoms) {
                throw new ReductionError('No grounded atoms available', expr);
            }

            const groundedName = expr.components[0].name;
            // Extract arguments from the product term (second component of application)
            const args = expr.components[1]?.components ?? [];

            const reduced = space.groundedAtoms.execute(groundedName, ...args);
            return { reduced, applied: true };
        } catch (error) {
            this.logError('Grounded atom evaluation failed', {
                expr: expr.toString(),
                error: error.message
            });
            // Propagate error or return original? 
            // For now, if grounded execution fails, we stop reduction of this step effectively
            // But usually we should throw or return error term.
            // Keeping consistent with previous behavior of logging but potentially swallowing if we just return original.
            // Ideally we rethrow critical errors or return an Error atom.
            // Let's rethrow for now as MeTTa errors should be visible.
            throw error;
        }
    }

    /**
     * Get stats
     * @returns {Object}
     */
    getStats() {
        return {
            ...super.getStats()
        };
    }
}
