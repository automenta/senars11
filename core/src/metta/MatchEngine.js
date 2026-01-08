/**
 * MatchEngine.js - MeTTa pattern matching and unification engine
 * Core pattern matching for match operations and macro expansion
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { Unification } from './helpers/MeTTaHelpers.js';

/**
 * MatchEngine - Pattern matching and unification for MeTTa
 * Handles variable binding and template instantiation
 */
export class MatchEngine extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null) {
        super(config, 'MatchEngine', eventBus, termFactory);
    }

    /**
     * Unify pattern with term, return bindings or null
     * @param {Term} pattern - Pattern with variables
     * @param {Term} term - Term to match against
     * @param {Object} bindings - Existing bindings
     * @returns {Object|null} - Bindings or null if unification fails
     */
    unify(pattern, term, bindings = {}) {
        return this.trackOperation('unify', () => {
            const result = Unification.unify(pattern, term, bindings);

            if (result) {
                this.emitMeTTaEvent('unification-success', {
                    bindingCount: Object.keys(result).length
                });
            }

            return result;
        });
    }

    /**
     * Substitute variables in template with bindings
     * @param {Term} template - Template with variables
     * @param {Object} bindings - Variable bindings
     * @returns {Term} - Instantiated term
     */
    substitute(template, bindings) {
        return this.trackOperation('substitute', () => {
            return Unification.subst(template, bindings);
        });
    }

    /**
     * Execute match query: (match space pattern template)
     * @param {MeTTaSpace} space - Space to query
     * @param {Term} pattern - Pattern to match
     * @param {Term} template - Result template
     * @returns {Array} - Array of instantiated results
     */
    executeMatch(space, pattern, template) {
        return this.trackOperation('executeMatch', () => {
            const atoms = space.getAtoms();

            const results = atoms
                .map(atom => this.unify(pattern, atom))
                .filter(bindings => bindings !== null)
                .map(bindings => this.substitute(template, bindings));

            this.emitMeTTaEvent('match-query-executed', {
                atomsChecked: atoms.length,
                resultsFound: results.length
            });

            return results;
        });
    }

    /**
     * Match all patterns against all terms
     * @param {Array<Term>} patterns - Patterns to match
     * @param {Array<Term>} terms - Terms to match against
     * @returns {Array} - Array of {pattern, term, bindings}
     */
    matchAll(patterns, terms) {
        return this.trackOperation('matchAll', () => {
            return Unification.matchAll(patterns, terms);
        });
    }
}
