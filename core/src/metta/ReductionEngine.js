/**
 * ReductionEngine.js - MeTTa reduction/evaluation engine
 * Reduces expressions to normal form via equality rules
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { Reduction, ReductionError } from './helpers/MeTTaHelpers.js';

/**
 * ReductionEngine - Pattern matching reduction engine
 * Evaluates expressions using equality-based rewriting
 */
export class ReductionEngine extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null, matchEngine = null) {
        super(config, 'ReductionEngine', eventBus, termFactory);
        this.matchEngine = matchEngine;
        this.reductionRules = [];
        this.maxSteps = config.maxReductionSteps || 1000;
    }

    /**
     * Add reduction rule: (= pattern result)
     * @param {Term} pattern - Pattern to match
     * @param {Term|Function} result - Result term or function (bindings) => term
     */
    addRule(pattern, result) {
        this.trackOperation('addRule', () => {
            this.reductionRules.push({ pattern, result });
            this.emitMeTTaEvent('rule-added', {
                ruleCount: this.reductionRules.length
            });
        });
    }

    /**
      * Reduce expression one step
      * @param {Term} expr - Expression to reduce
      * @param {MeTTaSpace} space - Space for grounded atom evaluation
      * @returns {Object} - {reduced, applied}
      */
    reduceStep(expr, space) {
        return this.trackOperation('reduceStep', () => {
            // Try each reduction rule
            for (const { pattern, result } of this.reductionRules) {
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

            // Try evaluating grounded atoms
            if (this._isGroundedCall(expr)) {
                try {
                    return { reduced: this._evalGrounded(expr, space), applied: true };
                } catch (error) {
                    this.logError('Grounded atom evaluation failed', {
                        expr: expr.toString(),
                        error: error.message
                    });
                }
            }

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
                this.logWarn('Max reduction steps reached', {
                    expr: expr.toString(),
                    steps
                });
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
        return expr.operator === '^' &&
            expr.components[0]?.name?.startsWith('&');
    }

    /**
     * Evaluate grounded atom
     * @param {Term} expr - Grounded atom expression
     * @param {MeTTaSpace} space - Space with grounded atoms
     * @returns {Term} - Result
     * @private
     */
    _evalGrounded(expr, space) {
        if (!space?.groundedAtoms) {
            throw new ReductionError('No grounded atoms available', expr);
        }

        const groundedName = expr.components[0].name;
        const args = expr.components[1]?.components ?? [];

        return space.groundedAtoms.execute(groundedName, ...args);
    }

    /**
     * Clear all rules
     */
    clearRules() {
        this.reductionRules = [];
        this.emitMeTTaEvent('rules-cleared', {});
    }

    /**
     * Get rule count
     * @returns {number}
     */
    getRuleCount() {
        return this.reductionRules.length;
    }

    /**
     * Get stats
     * @returns {Object}
     */
    getStats() {
        return {
            ...super.getStats(),
            ruleCount: this.reductionRules.length
        };
    }
}
