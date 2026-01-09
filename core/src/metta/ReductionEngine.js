import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { ReductionError } from './helpers/MeTTaHelpers.js';

export class ReductionEngine extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null, matchEngine = null) {
        super(config, 'ReductionEngine', eventBus, termFactory);
        this.matchEngine = matchEngine;
        this.maxSteps = config.maxReductionSteps ?? 1000;
    }

    reduceStep(expr, space) {
        return this.trackOperation('reduceStep', () => {
            const rules = space?.getRules?.() ?? [];
            for (const { pattern, result } of rules) {
                const bindings = this.matchEngine?.unify(pattern, expr);
                if (!bindings) continue;

                const reduced = typeof result === 'function' ? result(bindings) : this.matchEngine.substitute(result, bindings);
                this.emitMeTTaEvent('reduced', { original: expr.toString(), reduced: reduced.toString() });
                return { reduced, applied: true };
            }

            if (this._isGroundedCall(expr)) return this._evalGroundedSafely(expr, space);
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

    _isGroundedCall(expr) {
        return expr?.operator === '^' && expr.components?.[0]?.name?.startsWith('&');
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
}
