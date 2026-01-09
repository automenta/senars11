import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { Unification } from './helpers/MeTTaHelpers.js';

export class MatchEngine extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null) {
        super(config, 'MatchEngine', eventBus, termFactory);
    }

    unify(pattern, term, bindings = {}) {
        return this.trackOperation('unify', () => {
            const result = Unification.unify(pattern, term, bindings);
            if (result) this.emitMeTTaEvent('unification-success', { bindingCount: Object.keys(result).length });
            return result;
        });
    }

    substitute(template, bindings) {
        return this.trackOperation('substitute', () => Unification.subst(template, bindings, this.termFactory));
    }

    executeMatch(space, pattern, template) {
        return this.trackOperation('executeMatch', () => {
            const atoms = space.getAtoms?.() ?? [];
            if (!atoms.length) return [];

            const results = atoms.flatMap(atom => {
                const bindings = this.unify(pattern, atom);
                return bindings ? [this.substitute(template, bindings)] : [];
            });

            this.emitMeTTaEvent('match-query-executed', { atomsChecked: atoms.length, resultsFound: results.length });
            return results;
        });
    }

    matchAll(patterns, terms) {
        return this.trackOperation('matchAll', () => Unification.matchAll(patterns, terms));
    }
}
